import {
  AddNftsMetadataDto,
  BlockchainMicroservice,
  BurnNftDto,
  ChainType,
  CollectionsQuotaReachedQueryFilter,
  CreateBucketDto,
  CreateCollectionDTO,
  CreateEvmTransactionDto,
  CreateSubstrateTransactionDto,
  DeployCollectionDTO,
  env,
  EvmChain,
  getChainName,
  isEvmOrSubstrateWalletAddress,
  Lmas,
  LogType,
  Mailing,
  MintNftDTO,
  NestMintNftDTO,
  NFTCollectionQueryFilter,
  NFTCollectionType,
  ProductCode,
  QuotaCode,
  Scs,
  SerializeFor,
  ServiceName,
  SetCollectionBaseUriDTO,
  spendCreditAction,
  SpendCreditDto,
  SqlModelStatus,
  StorageMicroservice,
  SubstrateChain,
  TransactionDto,
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
import { ethers } from 'ethers';
import { v4 as uuidV4 } from 'uuid';
import {
  CollectionStatus,
  DbTables,
  NftsErrorCode,
  TransactionType,
} from '../../config/types';
import {
  NftsCodeException,
  NftsContractException,
  NftsNotFoundException,
  NftsValidationException,
} from '../../lib/exceptions';
import { DeployCollectionWorker } from '../../workers/deploy-collection-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Transaction } from '../transaction/models/transaction.model';
import { TransactionService } from '../transaction/transaction.service';
import { WalletService } from '../wallet/wallet.service';
import { Collection } from './models/collection.model';
import {
  deployNFTCollectionContract,
  getSubstrateContractClient,
} from '../../lib/utils/collection-utils';
import { ContractVersion } from './models/contractVersion.model';
import { SubstrateChainPrefix } from '@apillon/lib';

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
      collection_uuid: uuidV4(),
      status: SqlModelStatus.INCOMPLETE,
      chainType: Object.values(EvmChain).includes(params.body.chain as number)
        ? ChainType.EVM
        : ChainType.SUBSTRATE,
    });

    const product_id = {
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_COLLECTION,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_COLLECTION,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_COLLECTION,
      [SubstrateChain.ASTAR]: ProductCode.NFT_ASTAR_WASM_COLLECTION,
    }[params.body.chain];

    //Spend credit
    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: collection.project_uuid,
        product_id,
        referenceTable: DbTables.COLLECTION,
        referenceId: collection.collection_uuid,
        location: 'NftsService.createCollection',
        service: ServiceName.NFTS,
      },
      context,
    );

    await spendCreditAction(
      context,
      spendCredit,
      () =>
        new Promise(async (resolve, _reject) => {
          try {
            //Call storage MS, to create bucket used to upload NFT metadata. Bucket is not created if baseUri is provided.
            let nftMetadataBucket;
            if (!collection.baseUri) {
              try {
                const createBucketParams: CreateBucketDto =
                  new CreateBucketDto().populate({
                    project_uuid: params.body.project_uuid,
                    bucketType: 3,
                    name: `${collection.name} bucket`,
                  });
                nftMetadataBucket = (
                  await new StorageMicroservice(context).createBucket(
                    createBucketParams,
                  )
                ).data;
                collection.bucket_uuid = nftMetadataBucket.bucket_uuid;
              } catch (err) {
                throw await new NftsContractException(
                  NftsErrorCode.CREATE_BUCKET_FOR_NFT_METADATA_ERROR,
                  context,
                  err,
                ).writeToMonitor({});
              }
            }

            await collection.validateOrThrow(NftsValidationException);

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

              throw await new NftsContractException(
                NftsErrorCode.DEPLOY_NFT_CONTRACT_ERROR,
                context,
                err,
              ).writeToMonitor({
                logType: LogType.ERROR,
                service: ServiceName.NFTS,
                project_uuid: collection.project_uuid,
                user_uuid: context.user?.user_uuid,
                data: {
                  collection: collection.serialize(),
                  err,
                },
                sendAdminAlert: true,
              });
            }
            resolve(true);
          } catch (err) {
            _reject(err);
          }
        }),
    );

    await Promise.all([
      new Lmas().writeLog({
        context,
        project_uuid: collection.project_uuid,
        logType: LogType.INFO,
        message: 'New NFT collection created and submited to deployment',
        location: 'NftsService/deployNftContract',
        service: ServiceName.NFTS,
        data: { collection_uuid: collection.collection_uuid },
      }),

      // Set mailerlite field indicating the user has an nft collection
      new Mailing(context).setMailerliteField('has_nft', true),
    ]);

    collection.updateTime = new Date();
    collection.createTime = new Date();

    return collection.serializeByContext();
  }

  static async deployCollection(
    { body }: { body: DeployCollectionDTO },
    context: ServiceContext,
  ) {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);

    if (!collection.exists()) {
      throw new NftsCodeException({
        status: 404,
        code: NftsErrorCode.COLLECTION_NOT_FOUND,
        context,
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
        context,
      });
    }

    //Update collection sessions fields and status
    collection.imagesSession = body.imagesSession;
    collection.metadataSession = body.metadataSession;
    collection.collectionStatus = CollectionStatus.DEPLOY_INITIATED;
    await collection.update();

    //Call Storage MS function, which will prepareBase uri.
    //At the end, this function will trigger workers: DeployCollectionWorker, PrepareMetadataForCollectionWorker

    await new StorageMicroservice(context).prepareCollectionBaseUri({
      bucket_uuid: collection.bucket_uuid,
      collection_uuid: collection.collection_uuid,
      collectionName: collection.name,
      imagesSession: collection.imagesSession,
      metadataSession: collection.metadataSession,
      useApillonIpfsGateway: body.useApillonIpfsGateway,
    });

    return collection.serializeByContext();
  }

  /**
   * Function executes deploy collection worker - This should be used only for LOCAL_DEV
   * Called from storage microservice in PrepareBaseUriForCollectionWorker
   * @param params
   * @param context
   */
  static async executeDeployCollectionWorker(
    { body }: { body: { collection_uuid: string; baseUri: string } },
    context: ServiceContext,
  ) {
    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const parameters = {
      collection_uuid: body.collection_uuid,
      baseUri: body.baseUri,
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
      collection_uuid: body.collection_uuid,
      baseUri: body.baseUri,
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
    ).getList(
      context,
      new NFTCollectionQueryFilter(event.query),
      context.getSerializationStrategy(),
    );
  }

  static async getCollection(event: { id: any }, context: ServiceContext) {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateById(event.id);

    if (!collection.exists()) {
      throw new NftsNotFoundException();
    }
    collection.canAccess(context);

    return collection.serializeByContext();
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
      throw new NftsNotFoundException();
    }
    collection.canAccess(context);

    return collection.serializeByContext();
  }

  static async transferCollectionOwnership(
    { body }: { body: TransferCollectionDTO },
    context: ServiceContext,
  ) {
    console.log(
      `Transferring NFT Collection (uuid=${body.collection_uuid}) ownership to wallet address: ${body.address}`,
    );
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);
    if (
      !isEvmOrSubstrateWalletAddress(
        body.address,
        collection.chainType,
        SubstrateChainPrefix.ASTAR,
      )
    ) {
      throw new NftsCodeException({
        status: 422,
        code: NftsErrorCode.INVALID_ADDRESS,
        context,
        sourceFunction: 'transferCollectionOwnership',
      });
    }
    await NftsService.checkCollection(
      collection,
      'transferNftOwnership()',
      context,
    );

    await NftsService.checkTransferConditions(body, context, collection);

    const product_id = {
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_TRANSFER_COLLECTION,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_TRANSFER_COLLECTION,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_TRANSFER_COLLECTION,
      [SubstrateChain.ASTAR]: ProductCode.NFT_ASTAR_WASM_TRANSFER_COLLECTION,
    }[collection.chain];

    //Spend credit
    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: collection.project_uuid,
        product_id,
        referenceTable: DbTables.TRANSACTION,
        referenceId: uuidV4(),
        location: 'NftsService.transferCollectionOwnership',
        service: ServiceName.NFTS,
      },
      context,
    );

    await spendCreditAction(context, spendCredit, async () => {
      const { abi } = await new ContractVersion({}, context).getContractVersion(
        collection.collectionType,
        collection.chainType,
      );

      console.log(
        `[${getChainName(
          collection.chainType,
          collection.chain,
        )}] Creating NFT transfer contract ownership transaction from wallet address: ${
          collection.deployerAddress
        }, parameters=${JSON.stringify(collection)}`,
      );
      let txHash: string;
      switch (collection.chainType) {
        case ChainType.EVM: {
          const walletService = new WalletService(
            context,
            collection.chain as EvmChain,
          );
          const tx = await walletService.createTransferOwnershipTransaction(
            collection,
            body.address,
            abi,
          );
          txHash = ethers.utils.serializeTransaction(tx);
          break;
        }
        case ChainType.SUBSTRATE: {
          const substrateContractClient = await getSubstrateContractClient(
            context,
            collection.chain as SubstrateChain,
            JSON.parse(abi),
            collection.contractAddress,
          );
          try {
            const tx = await substrateContractClient.createTransaction(
              'ownable::transferOwnership',
              [body.address],
              collection.deployerAddress,
            );
            txHash = tx.toHex();
          } finally {
            await substrateContractClient.destroy();
          }
          break;
        }
        default: {
          throw new Error(
            `Support for chain type ${collection.chainType} not implemented`,
          );
        }
      }
      await NftsService.sendTransaction(
        context,
        collection,
        TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
        txHash,
        spendCredit.referenceId,
        46000,
      );
    });

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'NFT collection ownership transfered',
      location: 'NftsService/transferCollectionOwnership',
      service: ServiceName.NFTS,
      data: { collection_uuid: collection.collection_uuid },
    });

    return collection.serializeByContext();
  }

  static async setNftCollectionBaseUri(
    {
      body,
    }: {
      body: SetCollectionBaseUriDTO;
    },
    context: ServiceContext,
  ) {
    console.log(
      `Setting URI of NFT Collection (uuid=${body.collection_uuid}): ${body.uri}`,
    );

    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);

    await NftsService.checkCollection(
      collection,
      'setNftCollectionBaseUri()',
      context,
    );

    const product_id = {
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_SET_BASE_URI,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_SET_BASE_URI,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_SET_BASE_URI,
      [SubstrateChain.ASTAR]: ProductCode.NFT_ASTAR_WASM_SET_BASE_URI,
    }[collection.chain];

    //Spend credit
    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: collection.project_uuid,
        product_id,
        referenceTable: DbTables.TRANSACTION,
        referenceId: uuidV4(),
        location: 'NftsService.setNftCollectionBaseUri',
        service: ServiceName.NFTS,
      },
      context,
    );

    await spendCreditAction(context, spendCredit, async () => {
      const { abi } = await new ContractVersion({}, context).getContractVersion(
        collection.collectionType,
        collection.chainType,
      );

      console.log(
        `[${getChainName(
          collection.chainType,
          collection.chain,
        )}] Creating set NFT base URI transaction from wallet address: ${
          collection.deployerAddress
        }, parameters=${JSON.stringify(collection)}`,
      );
      let txHash: string;
      switch (collection.chainType) {
        case ChainType.EVM: {
          const walletService = new WalletService(
            context,
            collection.chain as EvmChain,
          );
          const tx = await walletService.createSetNftBaseUriTransaction(
            collection,
            body.uri,
            abi,
          );
          txHash = ethers.utils.serializeTransaction(tx);
          break;
        }
        case ChainType.SUBSTRATE: {
          const substrateContractClient = await getSubstrateContractClient(
            context,
            collection.chain as SubstrateChain,
            JSON.parse(abi),
            collection.contractAddress,
          );
          try {
            const tx = await substrateContractClient.createTransaction(
              'psp34Traits::setBaseUri',
              [body.uri],
              collection.deployerAddress,
            );
            txHash = tx.toHex();
          } finally {
            await substrateContractClient.destroy();
          }
          break;
        }
        default: {
          throw new Error(
            `Support for chain type ${collection.chainType} not implemented`,
          );
        }
      }
      await NftsService.sendTransaction(
        context,
        collection,
        TransactionType.SET_COLLECTION_BASE_URI,
        txHash,
        spendCredit.referenceId,
      );
    });

    return collection;
  }

  /**
   * Get NFT collections details for a project by project_uuid.
   * @param {{ project_uuid: string }} - uuid of the project
   * @param {ServiceContext} context
   */
  static async getProjectCollectionDetails(
    { project_uuid }: { project_uuid: string },
    context: ServiceContext,
  ): Promise<{ numOfCollections: number; nftTransactionCount: number }> {
    const numOfCollections = await new Collection(
      { project_uuid },
      context,
    ).getCollectionsCount();

    const nftTransactionCount = await new Transaction(
      { project_uuid },
      context,
    ).getTransactionCountOnProject(project_uuid);

    return { numOfCollections, nftTransactionCount };
  }

  //#endregion

  //#region NFT functions

  static async addNftsMetadata(
    { body }: { body: AddNftsMetadataDto },
    context: ServiceContext,
  ) {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);
    await NftsService.checkCollection(collection, 'addNfts()', context);

    //send message to storage sqs workers
    await sendToWorkerQueue(
      env.STORAGE_AWS_WORKER_SQS_URL,
      'PrepareMetadataForCollectionWorker',
      [
        {
          collection_uuid: body.collection_uuid,
          bucket_uuid: collection.bucket_uuid,
          imagesSession: body.imagesSession,
          metadataSession: body.metadataSession,
          useApillonIpfsGateway: !collection.baseUri.startsWith('ipfs://'),
        },
      ],
      null,
      null,
    );

    return true;
  }

  static async mintNftTo(
    { body }: { body: MintNftDTO },
    context: ServiceContext,
  ) {
    body.idsToMint ||= [];
    console.log(
      `Minting NFT Collection to wallet address: ${body.receivingAddress}`,
    );

    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);
    if (
      !isEvmOrSubstrateWalletAddress(
        body.receivingAddress,
        collection.chainType,
        SubstrateChainPrefix.ASTAR,
      )
    ) {
      throw new NftsCodeException({
        status: 422,
        code: NftsErrorCode.INVALID_ADDRESS,
        context,
        sourceFunction: 'mintNftTo',
      });
    }

    await NftsService.checkCollection(collection, 'mintNftTo()', context);

    const product_id = {
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_MINT,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_MINT,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_MINT,
      [SubstrateChain.ASTAR]: ProductCode.NFT_ASTAR_WASM_MINT,
    }[collection.chain];

    //Spend credit
    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: collection.project_uuid,
        product_id,
        referenceTable: DbTables.TRANSACTION,
        referenceId: uuidV4(),
        location: 'NftsService.mintNftTo',
        service: ServiceName.NFTS,
      },
      context,
    );

    const { data } = await spendCreditAction(context, spendCredit, async () => {
      const { abi } = await new ContractVersion({}, context).getContractVersion(
        collection.collectionType,
        collection.chainType,
      );
      console.log(
        `[${getChainName(
          collection.chainType,
          collection.chain,
        )}] Creating mint NFT transaction from wallet address: ${
          collection.deployerAddress
        }, parameters=${JSON.stringify(collection)}`,
      );
      let serializedTransaction: string;
      let minimumGas = null;
      switch (collection.chainType) {
        case ChainType.EVM: {
          const walletService = new WalletService(
            context,
            collection.chain as EvmChain,
          );
          const minted = await walletService.getNumberOfMintedNfts(
            context,
            collection,
          );
          await NftsService.checkMintConditions(
            body,
            context,
            collection,
            minted,
          );
          const tx = await walletService.createMintToTransaction(
            collection,
            body,
            abi,
          );
          serializedTransaction = ethers.utils.serializeTransaction(tx);
          minimumGas =
            260000 *
            (collection.isAutoIncrement
              ? body.quantity
              : body.idsToMint.length);
          break;
        }
        case ChainType.SUBSTRATE: {
          const substrateContractClient = await getSubstrateContractClient(
            context,
            collection.chain as SubstrateChain,
            JSON.parse(abi),
            collection.contractAddress,
          );
          try {
            const minted =
              await substrateContractClient.query('psp34::totalSupply');
            await NftsService.checkMintConditions(
              body,
              context,
              collection,
              minted,
            );
            const tx = await substrateContractClient.createTransaction(
              'launchpad::mintProject',
              [body.receivingAddress, body.quantity],
              collection.deployerAddress,
            );
            serializedTransaction = tx.toHex();
          } finally {
            await substrateContractClient.destroy();
          }
          break;
        }
        default: {
          throw new Error(
            `Support for chain type ${collection.chainType} not implemented`,
          );
        }
      }
      return await NftsService.sendTransaction(
        context,
        collection,
        TransactionType.MINT_NFT,
        serializedTransaction,
        spendCredit.referenceId,
        minimumGas,
      );
    });

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'NFT minted',
      location: 'NftsService/mintNftTo',
      service: ServiceName.NFTS,
      data: {
        collection_uuid: collection.collection_uuid,
        body,
      },
    });

    return { success: true, transactionHash: data.transactionHash };
  }

  static async nestMintNftTo(
    { body }: { body: NestMintNftDTO },
    context: ServiceContext,
  ) {
    const sourceFunction = 'nestMintNftTo()';
    console.log(
      `Nest minting NFT collection with id ${body.collection_uuid} under collection with id ${body.parentCollectionUuid} and token id ${body.parentNftId}.`,
    );
    const parentCollection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.parentCollectionUuid);
    // WASM contract doesnt support nestable collections
    if (parentCollection.chainType === ChainType.SUBSTRATE) {
      throw new NftsCodeException({
        status: 501,
        code: NftsErrorCode.ACTION_NOT_SUPPORTED,
        context,
      });
    }
    // only RMRK NFTs can be used for nesting
    if (parentCollection.collectionType !== NFTCollectionType.NESTABLE) {
      throw new NftsCodeException({
        code: NftsErrorCode.COLLECTION_TYPE_NOT_VALID,
        status: 422,
      });
    }

    const childCollection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);
    // only RMRK NFTs can be nest minted
    if (childCollection.collectionType !== NFTCollectionType.NESTABLE) {
      throw new NftsCodeException({
        code: NftsErrorCode.COLLECTION_TYPE_NOT_VALID,
        status: 422,
      });
    }

    if (parentCollection.chain !== childCollection.chain) {
      throw new NftsCodeException({
        code: NftsErrorCode.COLLECTION_PARENT_AND_CHILD_NFT_CHAIN_MISMATCH,
        status: 500,
      });
    }

    const walletService = new WalletService(
      context,
      childCollection.chain as EvmChain,
    );

    await NftsService.checkCollection(childCollection, sourceFunction, context);

    await NftsService.checkNestMintConditions(
      body,
      context,
      childCollection,
      walletService,
    );

    const tx = await walletService.createNestMintToTransaction(
      context,
      parentCollection.contractAddress,
      body.parentNftId,
      childCollection,
      body.quantity,
    );

    const product_id = {
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_MINT,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_MINT,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_MINT,
    }[childCollection.chain];

    //Spend credit
    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: parentCollection.project_uuid,
        product_id,
        referenceTable: DbTables.TRANSACTION,
        referenceId: uuidV4(),
        location: 'NftsService.nestMintNftTo',
        service: ServiceName.NFTS,
      },
      context,
    );
    const { data } = await spendCreditAction(
      context,
      spendCredit,
      async () =>
        await NftsService.sendTransaction(
          context,
          childCollection,
          TransactionType.NEST_MINT_NFT,
          ethers.utils.serializeTransaction(tx),
          spendCredit.referenceId,
        ),
    );

    await new Lmas().writeLog({
      context,
      project_uuid: childCollection.project_uuid,
      logType: LogType.INFO,
      message: 'NFT nest minted',
      location: 'NftsService/nestMintNftTo',
      service: ServiceName.NFTS,
      data: {
        collection_uuid: childCollection.collection_uuid,
        body,
      },
    });

    return { success: true, transactionHash: data.transactionHash };
  }

  static async burnNftToken(
    { body }: { body: BurnNftDto },
    context: ServiceContext,
  ) {
    console.log(
      `Burning NFT token (collection uuid=${body.collection_uuid}), tokenId= ${body.tokenId})`,
    );
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);
    // WASM contract doesnt implement burning for contract owner
    if (collection.chainType === ChainType.SUBSTRATE) {
      throw new NftsCodeException({
        status: 501,
        code: NftsErrorCode.ACTION_NOT_SUPPORTED,
        context,
      });
    }

    await NftsService.checkCollection(collection, 'burnNftToken()', context);

    const product_id = {
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_BURN,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_BURN,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_BURN,
      [SubstrateChain.ASTAR]: ProductCode.NFT_ASTAR_WASM_BURN,
    }[collection.chain];

    //Spend credit
    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: collection.project_uuid,
        product_id,
        referenceTable: DbTables.TRANSACTION,
        referenceId: uuidV4(),
        location: 'NftsService.burnNftToken',
        service: ServiceName.NFTS,
      },
      context,
    );
    const { data } = await spendCreditAction(context, spendCredit, async () => {
      {
        const { abi } = await new ContractVersion(
          {},
          context,
        ).getContractVersion(collection.collectionType, collection.chainType);

        console.log(
          `[${getChainName(
            collection.chainType,
            collection.chain,
          )}] Creating NFT burn transaction from wallet address: ${
            collection.deployerAddress
          }, parameters=${JSON.stringify(collection)}`,
        );
        let txHash: string;
        switch (collection.chainType) {
          case ChainType.EVM: {
            const walletService = new WalletService(
              context,
              collection.chain as EvmChain,
            );
            const tx = await walletService.createBurnNftTransaction(
              collection,
              body.tokenId,
              abi,
            );
            txHash = ethers.utils.serializeTransaction(tx);
            break;
          }
          // case ChainType.SUBSTRATE: {
          //   const substrateContractClient = await getSubstrateContractClient(
          //     context,
          //     collection.chain as SubstrateChain,
          //     JSON.parse(abi),
          //     collection.contractAddress,
          //   );
          //   try {
          //     const tx = await substrateContractClient.createTransaction(
          //       'psp34Burnable::burn',
          //       [collection.deployerAddress, body.tokenId],
          //       collection.deployerAddress,
          //     );
          //     txHash = tx.toHex();
          //   } finally {
          //     await substrateContractClient.destroy();
          //   }
          //   break;
          // }
          default: {
            throw new Error(
              `Support for chain type ${collection.chainType} not implemented`,
            );
          }
        }
        return await NftsService.sendTransaction(
          context,
          collection,
          TransactionType.BURN_NFT,
          txHash,
          spendCredit.referenceId,
        );
      }
    });

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'NFT burned',
      location: 'NftsService/burnNftToken',
      service: ServiceName.NFTS,
      data: {
        collection_uuid: collection.collection_uuid,
        body,
      },
    });

    return { success: true, transactionHash: data.transactionHash };
  }

  /**
   * Set a collection's status to archived
   * @param {{ collecton_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<Collection>}
   */
  static async archiveCollection(
    event: { collection_uuid: string },
    context: ServiceContext,
  ): Promise<Collection> {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(event.collection_uuid);

    await NftsService.checkCollection(
      collection,
      'archiveCollection()',
      context,
    );

    return await collection.markArchived();
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
        context,
        sourceFunction,
      });
    }
    collection.canAccess(context);
  }

  private static async checkMintConditions(
    params: MintNftDTO,
    context: ServiceContext,
    collection: Collection,
    alreadyMintedCount: number,
  ) {
    if (collection.maxSupply == 0) {
      return true;
    }

    if (alreadyMintedCount + params.quantity > collection.maxSupply) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_SUPPLY_ERROR,
        context,
        sourceFunction: 'mintNftTo()',
      });
    }

    if (
      collection.drop &&
      // for substrate NFTs dropReserve is always 0 so we need to skip this check
      collection.dropReserve &&
      collection.dropReserve - alreadyMintedCount < params.quantity
    ) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_RESERVE_ERROR,
        context,
        sourceFunction: 'mintNftTo()',
      });
    }

    if (
      !collection.isAutoIncrement &&
      params.idsToMint?.length !== params.quantity
    ) {
      throw new NftsCodeException({
        status: 422,
        code: NftsErrorCode.MINT_IDS_LENGTH_NOT_VALID,
        context,
        sourceFunction: 'mintNftTo()',
      });
    }
  }

  private static async checkNestMintConditions(
    params: NestMintNftDTO,
    context: ServiceContext,
    childCollection: Collection,
    walletService: WalletService,
  ) {
    const isChildNestable = await walletService.implementsRmrkInterface(
      context,
      childCollection,
    );
    if (!isChildNestable) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.COLLECTION_NOT_NESTABLE,
        context,
        sourceFunction: 'nestMintNftTo()',
      });
    }

    if (childCollection.maxSupply == 0) {
      return true;
    }

    const minted = await walletService.getNumberOfMintedNfts(
      context,
      childCollection,
    );

    if (minted + params.quantity > childCollection.maxSupply) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_SUPPLY_ERROR,
        context,
        sourceFunction: 'nestMintNftTo()',
      });
    }

    if (
      childCollection.drop &&
      childCollection.dropReserve - minted < params.quantity
    ) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_RESERVE_ERROR,
        context,
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
        context,
        sourceFunction: 'checkTransferConditions()',
      });
    }

    //Check if transaction for transfer contract already exists
    const transactions: Transaction[] = await new Transaction(
      {},
      context,
    ).getCollectionTransactions(
      collection.collection_uuid,
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
        context,
        sourceFunction: 'checkTransferConditions()',
      });
    }
  }

  //#endregion

  // TODO: we don't need this anymore so remove on separate PR
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

  private static async sendTransaction(
    context: ServiceContext,
    collection: Collection,
    transactionType: TransactionType,
    txHash: string,
    transaction_uuid: string,
    minimumGas?: number,
  ): Promise<{ data: TransactionDto }> {
    const conn = await context.mysql.start();
    try {
      const data = {
        chain: collection.chain,
        transaction: txHash,
        fromAddress: collection.deployerAddress,
        referenceTable: DbTables.COLLECTION,
        referenceId: collection.id,
        project_uuid: collection.project_uuid,
        minimumGas,
      };
      let response: { data: TransactionDto };
      switch (collection.chainType) {
        case ChainType.EVM: {
          response = await new BlockchainMicroservice(
            context,
          ).createEvmTransaction(new CreateEvmTransactionDto(data));
          break;
        }
        case ChainType.SUBSTRATE: {
          response = await new BlockchainMicroservice(
            context,
          ).createSubstrateTransaction(
            new CreateSubstrateTransactionDto(data, context),
          );
          break;
        }
        default: {
          throw new Error(
            `Support for chain type ${collection.chainType} not implemented`,
          );
        }
      }

      await TransactionService.saveTransaction(
        context,
        new Transaction(
          {
            chainId: collection.chain,
            transactionType,
            refTable: DbTables.COLLECTION,
            refId: collection.id,
            transactionHash: response.data.transactionHash,
            transactionStatus: TransactionStatus.PENDING,
            transaction_uuid,
          },
          context,
        ),
        conn,
      );
      await context.mysql.commit(conn);

      return response;
    } catch (err) {
      await context.mysql.rollback(conn);
      if (TYPE_ERROR_MAP[transactionType]) {
        throw await new NftsContractException(
          TYPE_ERROR_MAP[transactionType] ?? NftsErrorCode.GENERAL_SERVER_ERROR,
          context,
          err,
        ).writeToMonitor({});
      } else {
        throw err;
      }
    }
  }
}

const TYPE_ERROR_MAP: Record<TransactionType, NftsErrorCode> = {
  [TransactionType.DEPLOY_CONTRACT]: NftsErrorCode.DEPLOY_NFT_CONTRACT_ERROR,
  [TransactionType.TRANSFER_CONTRACT_OWNERSHIP]:
    NftsErrorCode.TRANSFER_NFT_CONTRACT_ERROR,
  [TransactionType.SET_COLLECTION_BASE_URI]:
    NftsErrorCode.SET_NFT_BASE_URI_ERROR,
  [TransactionType.MINT_NFT]: NftsErrorCode.MINT_NFT_ERROR,
  [TransactionType.NEST_MINT_NFT]: NftsErrorCode.NEST_MINT_NFT_ERROR,
  [TransactionType.BURN_NFT]: NftsErrorCode.BURN_NFT_ERROR,
};
