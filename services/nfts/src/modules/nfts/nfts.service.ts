import {
  AppEnvironment,
  BlockchainMicroservice,
  CreateBucketDto,
  CreateCollectionDTO,
  CreateEvmTransactionDto,
  DeployCollectionDTO,
  env,
  Lmas,
  LogType,
  MintNftDTO,
  NFTCollectionQueryFilter,
  SerializeFor,
  ServiceName,
  SetCollectionBaseUriDTO,
  SqlModelStatus,
  StorageMicroservice,
  TransferCollectionDTO,
} from '@apillon/lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  Chains,
  CollectionStatus,
  DbTables,
  NftsErrorCode,
  TransactionStatus,
  TransactionType,
} from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
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
import { ethers, UnsignedTransaction } from 'ethers';
import { BurnNftDto } from '@apillon/lib';

export class NftsService {
  static async getHello() {
    return 'Hello world from NFTS microservice';
  }

  //#region collection functions

  // TODO: Remove send transaction from all functions bellow, as we are planing to
  // send those in different worker/job
  static async createCollection(
    params: { body: CreateCollectionDTO },
    context: ServiceContext,
  ) {
    console.log(`Deploying NFT: ${JSON.stringify(params.body)}`);

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

    //Call storage MS, to create bucket used to upload NFT metadata
    let nftMetadataBucket;
    try {
      const createBucketParams: CreateBucketDto =
        new CreateBucketDto().populate({
          project_uuid: params.body.project_uuid,
          bucketType: 3,
          name: 'collection' + collection.collection_uuid,
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
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };
      const parameters = {
        collectionId: collection.id,
      };
      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.DEPLOY_COLLECTION,
        {
          parameters,
        },
      );

      const worker = new DeployCollectionWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor({
        collectionId: collection.id,
      });
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.NFTS_AWS_WORKER_SQS_URL,
        WorkerName.DEPLOY_COLLECTION,
        [
          {
            collectionId: collection.id,
          },
        ],
        null,
        null,
      );
    }

    return collection.serialize(SerializeFor.PROFILE);
  }

  static async listNftCollections(
    event: { query: NFTCollectionQueryFilter },
    context: ServiceContext,
  ) {
    console.log('Listing all NFT Collections');

    const collections = await new Collection(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new NFTCollectionQueryFilter(event.query));

    const responseCollections = [];

    for (const collection of collections.items) {
      const walletService: WalletService = new WalletService(collection.chain);
      const mintedNr = collection.contractAddress
        ? await walletService.getNumberOfMintedNfts(collection.contractAddress)
        : 0;

      responseCollections.push({
        ...collection,
        minted: mintedNr,
      });
    }
    return { items: responseCollections, total: collections.total };
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
    await collection.populateNumberOfMintedNfts();
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
    const walletService = new WalletService(collection.chain);

    await NftsService.checkCollection(
      collection,
      walletService,
      'transferNftOwnership()',
      context,
    );

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      const tx: UnsignedTransaction =
        await walletService.createTransferOwnershipTransaction(
          collection.contractAddress,
          params.body.address,
        );

      const blockchainRequest: CreateEvmTransactionDto =
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: ethers.utils.serializeTransaction(tx),
            fromAddress: collection.address,
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
        transactionHash: response.transactionHash,
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
    const walletService = new WalletService(collection.chain);

    await NftsService.checkCollection(
      collection,
      walletService,
      'setNftCollectionBaseUri()',
      context,
    );

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      const tx: UnsignedTransaction =
        await await walletService.createSetNftBaseUriTransaction(
          collection.contractAddress,
          params.body.uri,
        );

      const blockchainRequest: CreateEvmTransactionDto =
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: ethers.utils.serializeTransaction(tx),
            fromAddress: collection.address,
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
        transactionHash: response.transactionHash,
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
    const walletService = new WalletService(collection.chain);

    await NftsService.checkCollection(
      collection,
      walletService,
      'mintNftTo()',
      context,
    );

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
          params.body,
        );

      const blockchainRequest: CreateEvmTransactionDto =
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: ethers.utils.serializeTransaction(tx),
            fromAddress: collection.address,
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
        transactionHash: response.transactionHash,
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
    const walletService = new WalletService(collection.chain);

    await NftsService.checkCollection(
      collection,
      walletService,
      'burnNftToken()',
      context,
    );

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      const tx: UnsignedTransaction =
        await walletService.createBurnNftTransaction(
          collection.contractAddress,
          params.body.tokenId,
        );
      const blockchainRequest: CreateEvmTransactionDto =
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: ethers.utils.serializeTransaction(tx),
            fromAddress: collection.address,
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
        transactionHash: response.transactionHash,
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

  //#endregion

  //#region NFT functions

  private static async checkCollection(
    collection: Collection,
    walletService: WalletService,
    sourceFunction: string,
    context: ServiceContext,
  ) {
    // Collection must exist and be confirmed on blockchain
    if (!collection.exists() || collection.contractAddress == null) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_CONTRACT_OWNER_ERROR,
        context: context,
        sourceFunction,
      });
    }
    collection.canAccess(context);

    const currentOwner = await walletService.getContractOwner(
      collection.contractAddress,
    );

    if (collection.address !== currentOwner) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_CONTRACT_OWNER_ERROR,
        context: context,
        sourceFunction,
      });
    }
  }

  private static async checkMintConditions(
    params: MintNftDTO,
    context: ServiceContext,
    collection: Collection,
    walletService: WalletService,
  ) {
    const minted = await walletService.getNumberOfMintedNfts(
      collection.contractAddress,
    );

    if (minted + params.quantity > collection.maxSupply) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_SUPPLY_ERROR,
        context: context,
        sourceFunction: 'mintNftTo()',
      });
    }

    if (collection.reserve - minted < params.quantity) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_RESERVE_ERROR,
        context: context,
        sourceFunction: 'mintNftTo()',
      });
    }
  }

  //#endregion
}
