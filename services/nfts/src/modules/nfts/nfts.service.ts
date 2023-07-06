import {
  AppEnvironment,
  BlockchainMicroservice,
  BurnNftDto,
  CollectionsQuotaReachedQueryFilter,
  CreateBucketDto,
  CreateCollectionDTO,
  CreateEvmTransactionDto,
  DeployCollectionDTO,
  env,
  Lmas,
  LogType,
  MintNftDTO,
  NestMintNftDTO,
  NFTCollectionQueryFilter,
  NFTCollectionType,
  QuotaCode,
  Scs,
  SerializeFor,
  ServiceName,
  SetCollectionBaseUriDTO,
  SqlModelStatus,
  StorageMicroservice,
  TransactionStatus,
  TransferCollectionDTO,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { ethers, UnsignedTransaction } from 'ethers';
import { v4 as uuidV4 } from 'uuid';
import {
  Chains,
  CollectionStatus,
  DbTables,
  NftsErrorCode,
  TransactionType,
} from '../../config/types';
import {
  NftsCodeException,
  NftsValidationException,
} from '../../lib/exceptions';
import { deployNFTCollectionContract } from '../../lib/utils/collection-utils';
import { DeployCollectionWorker } from '../../workers/deploy-collection-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Transaction } from '../transaction/models/transaction.model';
import { TransactionService } from '../transaction/transaction.service';
import { WalletService } from '../wallet/wallet.service';
import { Collection } from './models/collection.model';

export class NftsService {
  //#region collection functions

  // TODO: Remove send transaction from all functions bellow, as we are planing to
  // send those in different worker/job
  static async createCollection(
    params: { body: CreateCollectionDTO },
    context: ServiceContext,
  ) {
    console.log(`Creating NFT collections: ${JSON.stringify(params.body)}`);

    //Create collection object
    const collection: Collection = new Collection(
      params.body,
      context,
    ).populate({
      isRevokable: params.body.isRevokable,
      isSoulbound: params.body.isSoulbound,
      chain: params.body.chain,
      royaltiesFees: params.body.royaltiesFees,
      royaltiesAddress: params.body.royaltiesAddress,
      collection_uuid: uuidV4(),
      status: SqlModelStatus.INCOMPLETE,
    });

    //check max collections quota
    const collectionsCount = await collection.getCollectionsCount();
    const maxCollectionsQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_NFT_COLLECTIONS,
      project_uuid: collection.project_uuid,
    });

    if (collectionsCount >= maxCollectionsQuota.value) {
      throw new NftsCodeException({
        code: NftsErrorCode.MAX_COLLECTIONS_REACHED,
        status: 400,
      });
    }

    //Call storage MS, to create bucket used to upload NFT metadata
    let nftMetadataBucket;
    try {
      const createBucketParams: CreateBucketDto =
        new CreateBucketDto().populate({
          project_uuid: params.body.project_uuid,
          bucketType: 3,
          name: collection.name + ' bucket',
        });
      nftMetadataBucket = (
        await new StorageMicroservice(context).createBucket(createBucketParams)
      ).data;
      collection.bucket_uuid = nftMetadataBucket.bucket_uuid;
    } catch (err) {
      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.CREATE_BUCKET_FOR_NFT_METADATA_ERROR,
        context: context,
        sourceFunction: 'deployNftContract()',
        errorMessage: 'Error creating bucket',
        details: err,
      }).writeToMonitor({});
    }

    try {
      console.log('collection123', collection);
      await collection.validate();
    } catch (err) {
      await collection.handle(err);
      if (!collection.isValid()) {
        throw new NftsValidationException(collection);
      }
    }

    const conn = await context.mysql.start();

    try {
      //Insert collection record to DB
      await collection.insert(SerializeFor.INSERT_DB, conn);

      //If baseUri is present, deploy nft collection contract
      if (collection.baseUri) {
        await deployNFTCollectionContract(context, collection, conn);
      }

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.DEPLOY_NFT_CONTRACT_ERROR,
        context: context,
        sourceFunction: 'deployNftContract()',
        errorMessage: 'Error deploying Nft contract',
        details: err,
      }).writeToMonitor({});
    }

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'New NFT collection created and submited to deployment',
      location: 'NftsService/deployNftContract',
      service: ServiceName.NFTS,
      data: collection.serialize(),
    });

    return collection.serialize(SerializeFor.PROFILE);
  }

  static async deployCollection(
    params: { body: DeployCollectionDTO },
    context: ServiceContext,
  ) {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(params.body.collection_uuid);

    if (!collection.exists()) {
      throw new NftsCodeException({
        status: 404,
        code: NftsErrorCode.COLLECTION_NOT_FOUND,
        context: context,
      });
    }
    if (
      collection.collectionStatus == CollectionStatus.DEPLOYED ||
      collection.collectionStatus == CollectionStatus.DEPLOY_INITIATED ||
      collection.collectionStatus == CollectionStatus.DEPLOYING
    ) {
      throw new NftsCodeException({
        status: 400,
        code: NftsErrorCode.COLLECTION_ALREADY_DEPLOYED,
        context: context,
      });
    }

    //Update collection sessions fields and status
    collection.imagesSession = params.body.imagesSession;
    collection.metadataSession = params.body.metadataSession;
    collection.collectionStatus = CollectionStatus.DEPLOY_INITIATED;
    await collection.update();

    //Send message to SQS or run directly for local and test environments
    if (
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      //Call Storage MS function, which will trigger worker
      await new StorageMicroservice(
        context,
      ).executePrepareCollectionBaseUriWorker({
        bucket_uuid: collection.bucket_uuid,
        collection_uuid: collection.collection_uuid,
        collectionName: collection.name,
        imagesSession: collection.imagesSession,
        metadataSession: collection.metadataSession,
      });
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        'PrepareBaseUriForCollectionWorker',
        [
          {
            bucket_uuid: collection.bucket_uuid,
            collection_uuid: collection.collection_uuid,
            collectionName: collection.name,
            imagesSession: collection.imagesSession,
            metadataSession: collection.metadataSession,
          },
        ],
        null,
        null,
      );
    }

    return collection.serialize(SerializeFor.PROFILE);
  }

  /**
   * Function executes deploy collection worker - This should be used only for LOCAL_DEV
   * Called from storage microservice in PrepareBaseUriForCollectionWorker
   * @param params
   * @param context
   */
  static async executeDeployCollectionWorker(
    params: { body: { collection_uuid: string; baseUri: string } },
    context: ServiceContext,
  ) {
    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const parameters = {
      collection_uuid: params.body.collection_uuid,
      baseUri: params.body.baseUri,
    };
    const wd = new WorkerDefinition(serviceDef, WorkerName.DEPLOY_COLLECTION, {
      parameters,
    });

    const worker = new DeployCollectionWorker(
      wd,
      context,
      QueueWorkerType.EXECUTOR,
    );
    await worker.runExecutor({
      collection_uuid: params.body.collection_uuid,
      baseUri: params.body.baseUri,
    });

    return { success: true };
  }

  static async listNftCollections(
    event: { query: NFTCollectionQueryFilter },
    context: ServiceContext,
  ) {
    console.log('Listing all NFT Collections');

    return await new Collection(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new NFTCollectionQueryFilter(event.query));
  }

  static async getCollection(event: { id: any }, context: ServiceContext) {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateById(event.id);

    if (!collection.exists()) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_COLLECTION_DOES_NOT_EXIST,
        context: context,
      });
    }
    collection.canAccess(context);

    return collection.serialize(SerializeFor.PROFILE);
  }

  static async getCollectionByUuid(
    event: { uuid: any },
    context: ServiceContext,
  ) {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(event.uuid);

    if (!collection.exists()) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_COLLECTION_DOES_NOT_EXIST,
        context: context,
      });
    }
    collection.canAccess(context);

    return collection.serialize(SerializeFor.PROFILE);
  }

  static async transferCollectionOwnership(
    params: { body: TransferCollectionDTO },
    context: ServiceContext,
  ) {
    console.log(
      `Transfering NFT Collection (uuid=${params.body.collection_uuid}) ownership to wallet address: ${params.body.address}`,
    );

    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(params.body.collection_uuid);
    const walletService = new WalletService(context, collection.chain);

    await NftsService.checkCollection(
      collection,
      'transferNftOwnership()',
      context,
    );

    await NftsService.checkTransferConditions(params.body, context, collection);

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      const tx: UnsignedTransaction =
        await walletService.createTransferOwnershipTransaction(
          collection.contractAddress,
          params.body.address,
          collection.collectionType,
        );

      const blockchainRequest: CreateEvmTransactionDto =
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: ethers.utils.serializeTransaction(tx),
            fromAddress: collection.deployerAddress,
            referenceTable: DbTables.COLLECTION,
            referenceId: collection.id,
          },
          context,
        );
      const response = await new BlockchainMicroservice(
        context,
      ).createEvmTransaction(blockchainRequest);

      //Populate DB transaction record with properties
      dbTxRecord.populate({
        chainId: collection.chain,
        transactionType: TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
        refTable: DbTables.COLLECTION,
        refId: collection.id,
        transactionHash: response.data.transactionHash,
        transactionStatus: TransactionStatus.PENDING,
      });
      //Insert to DB
      await TransactionService.saveTransaction(context, dbTxRecord, conn);

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.TRANSFER_NFT_CONTRACT_ERROR,
        context: context,
        sourceFunction: 'transferNftOwnership()',
        errorMessage: 'Error transfering Nft contract',
        details: err,
      }).writeToMonitor({});
    }

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'NFT collection ownership transfered',
      location: 'NftsService/transferCollectionOwnership',
      service: ServiceName.NFTS,
      data: collection.serialize(),
    });

    return collection.serialize(SerializeFor.PROFILE);
  }

  static async setNftCollectionBaseUri(
    params: {
      body: SetCollectionBaseUriDTO;
    },
    context: ServiceContext,
  ) {
    console.log(
      `Setting URI of NFT Collection (uuid=${params.body.collection_uuid}): ${params.body.uri}`,
    );

    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(params.body.collection_uuid);
    const walletService = new WalletService(context, collection.chain);

    await NftsService.checkCollection(
      collection,
      'setNftCollectionBaseUri()',
      context,
    );

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      const tx: UnsignedTransaction =
        await walletService.createSetNftBaseUriTransaction(
          collection.contractAddress,
          params.body.uri,
          collection.collectionType,
        );

      const blockchainRequest: CreateEvmTransactionDto =
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: ethers.utils.serializeTransaction(tx),
            fromAddress: collection.deployerAddress,
            referenceTable: DbTables.COLLECTION,
            referenceId: collection.id,
          },
          context,
        );
      const response = await new BlockchainMicroservice(
        context,
      ).createEvmTransaction(blockchainRequest);

      //Populate DB transaction record with properties
      dbTxRecord.populate({
        chainId: Chains.MOONBASE,
        transactionType: TransactionType.SET_COLLECTION_BASE_URI,
        refTable: DbTables.COLLECTION,
        refId: collection.id,
        transactionHash: response.data.transactionHash,
        transactionStatus: TransactionStatus.PENDING,
      });
      //Insert to DB
      await TransactionService.saveTransaction(context, dbTxRecord, conn);

      await context.mysql.commit(conn);
      return collection;
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.SET_NFT_BASE_URI_ERROR,
        context: context,
        sourceFunction: 'setNftCollectionBaseUri()',
        errorMessage: 'Error setting NFT collection base uri',
        details: err,
      }).writeToMonitor({});
    }
  }

  //#endregion

  //#region NFT functions

  static async mintNftTo(
    params: { body: MintNftDTO },
    context: ServiceContext,
  ) {
    console.log(
      `Minting NFT Collection to wallet address: ${params.body.receivingAddress}`,
    );

    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(params.body.collection_uuid);
    const walletService = new WalletService(context, collection.chain);

    await NftsService.checkCollection(collection, 'mintNftTo()', context);

    await NftsService.checkMintConditions(
      params.body,
      context,
      collection,
      walletService,
    );

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      const tx: UnsignedTransaction =
        await walletService.createMintToTransaction(
          collection.contractAddress,
          collection.collectionType,
          params.body,
        );

      const blockchainRequest: CreateEvmTransactionDto =
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: ethers.utils.serializeTransaction(tx),
            fromAddress: collection.deployerAddress,
            referenceTable: DbTables.COLLECTION,
            referenceId: collection.id,
          },
          context,
        );
      const response = await new BlockchainMicroservice(
        context,
      ).createEvmTransaction(blockchainRequest);

      //Populate DB transaction record with properties
      dbTxRecord.populate({
        chainId: Chains.MOONBASE,
        transactionType: TransactionType.MINT_NFT,
        refTable: DbTables.COLLECTION,
        refId: collection.id,
        transactionHash: response.data.transactionHash,
        transactionStatus: TransactionStatus.PENDING,
      });
      //Insert to DB
      await TransactionService.saveTransaction(context, dbTxRecord, conn);

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_ERROR,
        context: context,
        sourceFunction: 'mintNftTo()',
        errorMessage: 'Error minting NFT',
        details: err,
      }).writeToMonitor({});
    }

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'NFT minted',
      location: 'NftsService/mintNftTo',
      service: ServiceName.NFTS,
      data: {
        collection: collection.serialize(SerializeFor.PROFILE),
        body: params.body,
      },
    });

    return { success: true };
  }

  static async nestMintNftTo(
    params: { body: NestMintNftDTO },
    context: ServiceContext,
  ) {
    const sourceFunction = 'nestMintNftTo()';
    console.log(
      `Nest minting NFT collection with id ${params.body.collection_uuid} under collection with id ${params.body.destinationCollectionUuid} and token id ${params.body.destinationNftId}.`,
    );
    const destinationCollection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(params.body.destinationCollectionUuid);
    // only RMRK NFTs can be used for nesting
    if (destinationCollection.collectionType !== NFTCollectionType.NESTABLE) {
      throw new NftsCodeException({
        code: NftsErrorCode.COLLECTION_TYPE_NOT_VALID,
        status: 422,
      });
    }

    const collectionNested: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(params.body.collection_uuid);
    // only RMRK NFTs can be nest minted
    if (collectionNested.collectionType !== NFTCollectionType.NESTABLE) {
      throw new NftsCodeException({
        code: NftsErrorCode.COLLECTION_TYPE_NOT_VALID,
        status: 422,
      });
    }

    if (destinationCollection.chain !== collectionNested.chain) {
      throw new NftsCodeException({
        code: NftsErrorCode.COLLECTION_NESTABLE_AND_NESTING_CHAIN_MISMATCH,
        status: 400,
      });
    }

    const walletService = new WalletService(context, collectionNested.chain);

    await NftsService.checkCollection(
      collectionNested,
      sourceFunction,
      context,
    );

    await NftsService.checkNestMintConditions(
      params.body,
      context,
      collectionNested,
      walletService,
    );

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      const tx: UnsignedTransaction =
        await walletService.createNestMintToTransaction(
          destinationCollection.contractAddress,
          params.body.destinationNftId,
          collectionNested.contractAddress,
          collectionNested.collectionType,
          params.body.quantity,
        );

      const blockchainRequest: CreateEvmTransactionDto =
        new CreateEvmTransactionDto(
          {
            chain: collectionNested.chain,
            transaction: ethers.utils.serializeTransaction(tx),
            fromAddress: collectionNested.deployerAddress,
            referenceTable: DbTables.COLLECTION,
            referenceId: collectionNested.id,
          },
          context,
        );
      const response = await new BlockchainMicroservice(
        context,
      ).createEvmTransaction(blockchainRequest);

      //Populate DB transaction record with properties
      dbTxRecord.populate({
        chainId: Chains.MOONBASE,
        transactionType: TransactionType.NEST_MINT_NFT,
        refTable: DbTables.COLLECTION,
        refId: collectionNested.id,
        transactionHash: response.data.transactionHash,
        transactionStatus: TransactionStatus.PENDING,
      });
      //Insert to DB
      await TransactionService.saveTransaction(context, dbTxRecord, conn);

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_ERROR,
        context: context,
        sourceFunction: sourceFunction,
        errorMessage: 'Error nest minting NFT',
        details: err,
      }).writeToMonitor({});
    }

    await new Lmas().writeLog({
      context,
      project_uuid: collectionNested.project_uuid,
      logType: LogType.INFO,
      message: 'NFT nest minted',
      location: 'NftsService/nestMintNftTo',
      service: ServiceName.NFTS,
      data: {
        collection: collectionNested.serialize(SerializeFor.PROFILE),
        body: params.body,
      },
    });

    return { success: true };
  }

  static async burnNftToken(
    params: { body: BurnNftDto },
    context: ServiceContext,
  ) {
    console.log(
      `Burning NFT token (collection uuid=${params.body.collection_uuid}), tokenId= ${params.body.tokenId})`,
    );
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(params.body.collection_uuid);
    const walletService = new WalletService(context, collection.chain);

    await NftsService.checkCollection(collection, 'burnNftToken()', context);

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      const tx: UnsignedTransaction =
        await walletService.createBurnNftTransaction(
          collection.contractAddress,
          collection.collectionType,
          params.body.tokenId,
        );
      const blockchainRequest: CreateEvmTransactionDto =
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: ethers.utils.serializeTransaction(tx),
            fromAddress: collection.deployerAddress,
            referenceTable: DbTables.COLLECTION,
            referenceId: collection.id,
          },
          context,
        );
      const response = await new BlockchainMicroservice(
        context,
      ).createEvmTransaction(blockchainRequest);

      //Populate DB transaction record with properties
      dbTxRecord.populate({
        chainId: Chains.MOONBASE,
        transactionType: TransactionType.BURN_NFT,
        refTable: DbTables.COLLECTION,
        refId: collection.id,
        transactionHash: response.data.transactionHash,
        transactionStatus: TransactionStatus.PENDING,
      });
      //Insert to DB
      await TransactionService.saveTransaction(context, dbTxRecord, conn);

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.BURN_NFT_ERROR,
        context: context,
        sourceFunction: 'burnNftToken()',
        errorMessage: 'Error burning NFT',
        details: err,
      }).writeToMonitor({});
    }

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'NFT burned',
      location: 'NftsService/burnNftToken',
      service: ServiceName.NFTS,
      data: {
        collection: collection.serialize(SerializeFor.PROFILE),
        body: params.body,
      },
    });

    return { success: true };
  }

  private static async checkCollection(
    collection: Collection,
    sourceFunction: string,
    context: ServiceContext,
  ) {
    // Collection must exist and be confirmed on blockchain
    if (
      !collection.exists() ||
      collection.contractAddress == null ||
      collection.collectionStatus == CollectionStatus.TRANSFERED
    ) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_CONTRACT_OWNER_ERROR,
        context: context,
        sourceFunction,
      });
    }
    collection.canAccess(context);
  }

  private static async checkMintConditions(
    params: MintNftDTO,
    context: ServiceContext,
    collection: Collection,
    walletService: WalletService,
  ) {
    if (collection.maxSupply == 0) {
      return true;
    }

    const minted = await walletService.getNumberOfMintedNfts(collection);

    if (minted + params.quantity > collection.maxSupply) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_SUPPLY_ERROR,
        context: context,
        sourceFunction: 'mintNftTo()',
      });
    }

    if (collection.drop && collection.dropReserve - minted < params.quantity) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_RESERVE_ERROR,
        context: context,
        sourceFunction: 'mintNftTo()',
      });
    }
  }

  private static async checkNestMintConditions(
    params: NestMintNftDTO,
    context: ServiceContext,
    collection: Collection,
    walletService: WalletService,
  ) {
    if (collection.maxSupply == 0) {
      return true;
    }

    const minted = await walletService.getNumberOfMintedNfts(collection);

    if (minted + params.quantity > collection.maxSupply) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_SUPPLY_ERROR,
        context: context,
        sourceFunction: 'nestMintNftTo()',
      });
    }

    if (collection.drop && collection.dropReserve - minted < params.quantity) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_RESERVE_ERROR,
        context: context,
        sourceFunction: 'nestMintNftTo()',
      });
    }
  }

  /**
   * CONDITIONS:
   * Address should not be the same as deployer address
   * If transaction for transfer already exists (is pending or finished), transfer should fail
   * @param params
   * @param context
   * @param collection
   * @returns
   */
  private static async checkTransferConditions(
    params: TransferCollectionDTO,
    context: ServiceContext,
    collection: Collection,
  ) {
    if (collection.deployerAddress == params.address) {
      throw new NftsCodeException({
        status: 400,
        code: NftsErrorCode.INVALID_ADDRESS_FOR_TRANSFER_TO,
        context: context,
        sourceFunction: 'checkTransferConditions()',
      });
    }

    //Check if transaction for transfer contract already exists
    const transactions: Transaction[] = await new Transaction(
      {},
      context,
    ).getCollectionTransactions(
      collection.id,
      null,
      TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
    );

    if (
      transactions.find(
        (x) =>
          x.transactionStatus == TransactionStatus.PENDING ||
          x.transactionStatus == TransactionStatus.CONFIRMED,
      )
    ) {
      throw new NftsCodeException({
        status: 400,
        code: NftsErrorCode.TRANSACTION_FOR_TRANSFER_ALREADY_EXISTS,
        context: context,
        sourceFunction: 'checkTransferConditions()',
      });
    }
  }

  //#endregion

  static async maxCollectionsQuotaReached(
    event: { query: CollectionsQuotaReachedQueryFilter },
    context: ServiceContext,
  ) {
    const collection: Collection = new Collection(
      { project_uuid: event.query.project_uuid },
      context,
    );

    const collectionsCount = await collection.getCollectionsCount();
    const maxCollectionsQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_NFT_COLLECTIONS,
      project_uuid: collection.project_uuid,
    });

    return {
      maxCollectionsQuotaReached: collectionsCount >= maxCollectionsQuota.value,
    };
  }
}
