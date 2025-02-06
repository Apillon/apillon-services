import {
  AddNftsMetadataDto,
  BlockchainMicroservice,
  BurnNftDto,
  Chain,
  ChainType,
  CollectionsQuotaReachedQueryFilter,
  Context,
  CreateBucketDto,
  CreateEvmTransactionDto,
  CreateIpnsDto,
  CreateSubstrateTransactionDto,
  DeployCollectionDTO,
  ENTERPRISE_USER_EVM_CHAINS,
  env,
  EvmChain,
  getChainName,
  HttpException,
  Lmas,
  LogType,
  Mailing,
  MintNftDTO,
  NestMintNftDTO,
  NFTCollectionQueryFilter,
  NFTCollectionType,
  PoolConnection,
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
  SubscriptionPackageId,
  SubstrateChain,
  TransactionDto,
  TransactionStatus,
  TransferCollectionDTO,
} from '@apillon/lib';
import {
  CreateCollectionDTO,
  CreateUniqueCollectionDTO,
  isEvmOrSubstrateWalletAddress,
} from '@apillon/blockchain-lib/common';
import { ServiceContext } from '@apillon/service-lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { BigNumber } from '@ethersproject/bignumber';
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
  NftsModelValidationException,
  NftsNotFoundException,
  NftsValidationException,
} from '../../lib/exceptions';
import { DeployCollectionWorker } from '../../workers/deploy-collection-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Transaction } from '../transaction/models/transaction.model';
import { TransactionService } from '../transaction/transaction.service';
import { Collection } from './models/collection.model';
import {
  deployNFTCollectionContract,
  getEvmContractClient,
  getSubstrateContractClient,
} from '../../lib/utils/collection-utils';
import { ContractVersion } from './models/contractVersion.model';
import { EVM_MAX_INT } from '@apillon/blockchain-lib/evm';
import { UniqueNftClient } from './clients/unique-nft-client';
import { SubstrateChainPrefix } from '@apillon/blockchain-lib/substrate';
import { CollectionMetadata } from './models/collectionMetadata.model';

export class NftsService {
  //#region collection functions

  static async createCollection(
    params: { body: CreateCollectionDTO },
    context: ServiceContext,
  ) {
    console.log(`Creating NFT collections: ${JSON.stringify(params.body)}`);
    const collection: Collection = new Collection(
      params.body,
      context,
    ).populate({
      collection_uuid: uuidV4(),
      status: SqlModelStatus.INCOMPLETE,
      chainType: params.body.chainType,
    });
    await NftsService.assertIsAllowedToCreateNftCollection(
      context,
      collection.chainType,
      collection.chain,
      params.body.project_uuid,
    );

    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.NFT_ETHEREUM_COLLECTION,
      [EvmChain.SEPOLIA]: ProductCode.NFT_SEPOLIA_COLLECTION,
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_COLLECTION,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_COLLECTION,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_COLLECTION,
      [EvmChain.BASE]: ProductCode.NFT_BASE_COLLECTION,
      [EvmChain.BASE_SEPOLIA]: ProductCode.NFT_BASE_SEPOLIA_COLLECTION,
      [SubstrateChain.ASTAR]: ProductCode.NFT_ASTAR_WASM_COLLECTION,
      [SubstrateChain.UNIQUE]: ProductCode.NFT_UNIQUE_COLLECTION,
    }[params.body.chain];
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

    await spendCreditAction(context, spendCredit, async () => {
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

      await collection.validateOrThrow(NftsModelValidationException);

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
            collection_uuid: collection.collection_uuid,
            chainType: collection.chainType,
            chain: collection.chain,
            collectionType: collection.collectionType,
            err,
          },
          sendAdminAlert: true,
        });
      }
    });

    await Promise.all([
      new Lmas().writeLog({
        context,
        project_uuid: collection.project_uuid,
        logType: LogType.INFO,
        message: 'New NFT collection created and submited to deployment',
        location: 'NftsService/deployNftContract',
        service: ServiceName.NFTS,
        data: {
          collection_uuid: collection.collection_uuid,
          chainType: collection.chainType,
          chain: collection.chain,
          collectionType: collection.collectionType,
        },
      }),

      // Set mailerlite field indicating the user has an nft collection
      new Mailing(context).setMailerliteField('has_nft'),
    ]);

    collection.updateTime = new Date();
    collection.createTime = new Date();

    return collection.serializeByContext();
  }

  static async createUniqueCollection(
    params: { body: CreateUniqueCollectionDTO },
    context: ServiceContext,
  ) {
    console.log(
      `Creating Unique NFT collection: ${JSON.stringify(params.body)}`,
    );
    const collection: Collection = new Collection(
      params.body,
      context,
    ).populate({
      collection_uuid: uuidV4(),
      status: SqlModelStatus.ACTIVE,
      chainType: ChainType.SUBSTRATE,
      chain: SubstrateChain.UNIQUE,
      // dummy fields for SQL query not to fail
      dropPrice: 0,
      dropStart: 0,
      dropReserve: 0,
      baseExtension: '',
    });
    await collection.validateOrThrow(NftsModelValidationException);
    await NftsService.assertIsAllowedToCreateNftCollection(
      context,
      collection.chainType,
      collection.chain,
      params.body.project_uuid,
    );

    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: collection.project_uuid,
        product_id: ProductCode.NFT_UNIQUE_COLLECTION,
        referenceTable: DbTables.COLLECTION,
        referenceId: collection.collection_uuid,
        location: 'NftsService.createCollection',
        service: ServiceName.NFTS,
      },
      context,
    );

    await spendCreditAction(context, spendCredit, async () => {
      const conn = await context.mysql.start();
      try {
        await collection.insert(SerializeFor.INSERT_DB, conn);
        await new CollectionMetadata({}, context).batchInsert(
          collection.id,
          params.body.metadata,
          conn,
        );
        await deployNFTCollectionContract(context, collection, conn);
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
    });

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
      new Mailing(context).setMailerliteField('has_nft'),
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
    try {
      await new StorageMicroservice(context).prepareCollectionBaseUri({
        bucket_uuid: collection.bucket_uuid,
        collection_uuid: collection.collection_uuid,
        collectionName: collection.name,
        imagesSession: collection.imagesSession,
        metadataSession: collection.metadataSession,
        useApillonIpfsGateway: collection.useApillonIpfsGateway,
        useIpns: collection.useIpns,
      });
    } catch (err) {
      //Status should be set back to CREATED, so that it is possible to execute deploy again
      console.error(
        'Error at prepareCollectionBaseUri. Updating collection status back to CREATED.',
        err,
      );
      collection.collectionStatus = CollectionStatus.CREATED;
      await collection.update();

      throw err;
    }

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
        collection.chain === SubstrateChain.UNIQUE
          ? SubstrateChainPrefix.UNIQUE
          : SubstrateChainPrefix.ASTAR,
      )
    ) {
      throw new NftsValidationException({
        code:
          collection.chainType === ChainType.EVM
            ? NftsErrorCode.INVALID_EVM_ADDRESS
            : NftsErrorCode.INVALID_SUBSTRATE_ADDRESS,
        property: 'address',
      });
    }
    await NftsService.checkCollection(
      collection,
      'transferNftOwnership()',
      context,
    );

    await NftsService.checkTransferConditions(body, context, collection);

    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.NFT_ETHEREUM_TRANSFER_COLLECTION,
      [EvmChain.SEPOLIA]: ProductCode.NFT_SEPOLIA_TRANSFER_COLLECTION,
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_TRANSFER_COLLECTION,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_TRANSFER_COLLECTION,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_TRANSFER_COLLECTION,
      [EvmChain.BASE]: ProductCode.NFT_BASE_TRANSFER_COLLECTION,
      [EvmChain.BASE_SEPOLIA]: ProductCode.NFT_BASE_SEPOLIA_TRANSFER_COLLECTION,
      [SubstrateChain.ASTAR]: ProductCode.NFT_ASTAR_WASM_TRANSFER_COLLECTION,
      [SubstrateChain.UNIQUE]: ProductCode.NFT_UNIQUE_TRANSFER_COLLECTION,
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
      const chainName = getChainName(collection.chainType, collection.chain);
      console.info(
        `[${chainName}] Creating NFT transfer contract ownership transaction from wallet address: ${
          collection.deployerAddress
        }, parameters=${JSON.stringify(collection)}`,
      );
      let txHash: string, callMethod: string;
      const callArguments = [body.address];
      switch (collection.chainType) {
        case ChainType.EVM: {
          const { abi } = await new ContractVersion(
            {},
            context,
          ).getContractVersion(collection.collectionType, collection.chainType);
          const evmContractClient = await getEvmContractClient(
            context,
            collection.chain as EvmChain,
            abi,
            collection.contractAddress,
          );
          callMethod = 'transferOwnership';
          txHash = await evmContractClient.createTransaction(
            callMethod,
            callArguments,
          );
          break;
        }
        case ChainType.SUBSTRATE: {
          if (collection.chain === SubstrateChain.UNIQUE) {
            const client = new UniqueNftClient(env.UNIQUE_NETWORK_API_URL);
            txHash = await client.transferOwnership(
              collection.contractAddress,
              body.address,
            );
          } else {
            const { abi } = await new ContractVersion(
              {},
              context,
            ).getContractVersion(
              collection.collectionType,
              collection.chainType,
            );
            const substrateContractClient = await getSubstrateContractClient(
              context,
              collection.chain as SubstrateChain,
              JSON.parse(abi),
              collection.contractAddress,
            );
            try {
              callMethod = 'ownable::transferOwnership';
              const tx = await substrateContractClient.createTransaction(
                callMethod,
                callArguments,
                collection.deployerAddress,
              );
              txHash = tx.toHex();
            } finally {
              await substrateContractClient.destroy();
            }
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
        callMethod,
        callArguments,
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
    if (
      collection.chainType === ChainType.SUBSTRATE &&
      collection.chain === SubstrateChain.UNIQUE
    ) {
      throw new NftsCodeException({
        status: 405,
        code: NftsErrorCode.METHOD_NOT_ALLOWED,
        context,
      });
    }

    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.NFT_ETHEREUM_SET_BASE_URI,
      [EvmChain.SEPOLIA]: ProductCode.NFT_SEPOLIA_SET_BASE_URI,
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_SET_BASE_URI,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_SET_BASE_URI,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_SET_BASE_URI,
      [EvmChain.BASE]: ProductCode.NFT_BASE_SET_BASE_URI,
      [EvmChain.BASE_SEPOLIA]: ProductCode.NFT_BASE_SEPOLIA_SET_BASE_URI,
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
      const { abi } = await new ContractVersion({}, context).populateById(
        collection.contractVersion_id,
      );
      const chainName = getChainName(collection.chainType, collection.chain);
      console.info(
        `[${chainName}] Creating set NFT base URI transaction from wallet address: ${
          collection.deployerAddress
        }, parameters=${JSON.stringify(collection)}`,
      );
      let txHash: string, callMethod: string;
      const callArguments = [body.uri];
      switch (collection.chainType) {
        case ChainType.EVM: {
          const evmContractClient = await getEvmContractClient(
            context,
            collection.chain as EvmChain,
            abi,
            collection.contractAddress,
          );
          callMethod = 'setBaseURI';
          txHash = await evmContractClient.createTransaction(
            callMethod,
            callArguments,
          );
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
            callMethod = 'psp34Traits::setBaseUri';
            const tx = await substrateContractClient.createTransaction(
              callMethod,
              callArguments,
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
        callMethod,
        callArguments,
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
          useApillonIpfsGateway:
            collection.useApillonIpfsGateway ??
            !collection.baseUri.startsWith('ipfs://'),
          ipns_uuid: collection.ipns_uuid,
        },
      ],
      null,
      null,
    );

    return true;
  }

  static async addIpnsToCollection(
    { collection_uuid }: { collection_uuid: string },
    context: ServiceContext,
  ) {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(collection_uuid);
    await NftsService.checkCollection(
      collection,
      'addIpnsToCollection()',
      context,
    );

    if (collection.ipns_uuid) {
      throw new NftsCodeException({
        status: 400,
        code: NftsErrorCode.COLLECTION_ALREADY_HAVE_IPNS,
        context,
        sourceFunction: 'addIpnsToCollection()',
      });
    }

    //Call storageMS to generate IPNS
    const createIpnsDto = new CreateIpnsDto({}, context).populate({
      bucket_uuid: collection.bucket_uuid,
      name: `${collection.name} IPNS record`,
      cid: collection.cid,
    });
    const ipnsRes = (
      await new StorageMicroservice(context).createIpns(createIpnsDto)
    ).data;

    console.info('Ipns for collection', ipnsRes);

    const baseUri = collection.useApillonIpfsGateway
      ? ipnsRes.link.split('?token')[0]
      : `ipns://${ipnsRes.ipnsName}/`;

    console.info('baseUri', baseUri);

    //Submit change base uri transaction
    const setBaseUriBody = new SetCollectionBaseUriDTO(
      {
        uri: baseUri,
        collection_uuid: collection.collection_uuid,
      },
      context,
    );
    await NftsService.setNftCollectionBaseUri(
      { body: setBaseUriBody },
      context,
    );

    console.info('Set collection base uri succeeded. Updating collection...');

    collection.baseUri = baseUri;
    collection.ipns_uuid = ipnsRes.ipns_uuid;
    collection.useIpns = true;
    await collection.update();

    return collection.serializeByContext(context);
  }

  static async mintNftTo(
    { body }: { body: MintNftDTO },
    context: ServiceContext,
  ) {
    body.idsToMint ||= [];
    console.log(
      `Minting NFT Collection ${body.collection_uuid} to wallet address: ${body.receivingAddress}`,
    );

    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);
    if (
      !isEvmOrSubstrateWalletAddress(
        body.receivingAddress,
        collection.chainType,
        collection.chain === SubstrateChain.UNIQUE
          ? SubstrateChainPrefix.UNIQUE
          : SubstrateChainPrefix.ASTAR,
      )
    ) {
      throw new NftsValidationException({
        code:
          collection.chainType === ChainType.EVM
            ? NftsErrorCode.INVALID_EVM_ADDRESS
            : NftsErrorCode.INVALID_SUBSTRATE_ADDRESS,
        property: 'receivingAddress',
      });
    }

    await NftsService.checkCollection(collection, 'mintNftTo()', context);

    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.NFT_ETHEREUM_MINT,
      [EvmChain.SEPOLIA]: ProductCode.NFT_SEPOLIA_MINT,
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_MINT,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_MINT,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_MINT,
      [EvmChain.BASE]: ProductCode.NFT_BASE_MINT,
      [EvmChain.BASE_SEPOLIA]: ProductCode.NFT_BASE_SEPOLIA_MINT,
      [SubstrateChain.ASTAR]: ProductCode.NFT_ASTAR_WASM_MINT,
      [SubstrateChain.UNIQUE]: ProductCode.NFT_UNIQUE_MINT,
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

    let tokenIds: number[] = [];
    const { data } = await spendCreditAction(context, spendCredit, async () => {
      const chainName = getChainName(collection.chainType, collection.chain);
      console.info(
        `[${chainName}] Creating mint NFT transaction from wallet address: ${
          collection.deployerAddress
        }, parameters=${JSON.stringify(collection)}`,
      );
      let minimumGas = null;
      let serializedTransaction: string,
        callMethod: string,
        callArguments: unknown[];
      switch (collection.chainType) {
        case ChainType.EVM: {
          const { abi } = await new ContractVersion(
            {},
            context,
          ).getContractVersion(collection.collectionType, collection.chainType);
          const evmContractClient = await getEvmContractClient(
            context,
            collection.chain as EvmChain,
            abi,
            collection.contractAddress,
          );

          const minted =
            (collection.collectionStatus != CollectionStatus.DEPLOYED &&
              collection.collectionStatus != CollectionStatus.TRANSFERED) ||
            !collection.contractAddress
              ? 0
              : await evmContractClient.query<number>('totalSupply');
          await NftsService.checkMintConditions(
            body,
            context,
            collection,
            minted,
          );

          callMethod = collection.isAutoIncrement
            ? 'ownerMint'
            : 'ownerMintIds';
          callArguments = collection.isAutoIncrement
            ? [body.receivingAddress, body.quantity]
            : [body.receivingAddress, body.quantity, body.idsToMint];
          await evmContractClient.createTransaction(callMethod, callArguments);
          minimumGas =
            260000 *
            (collection.isAutoIncrement
              ? body.quantity
              : body.idsToMint.length);
          break;
        }
        case ChainType.SUBSTRATE: {
          if (collection.chain === SubstrateChain.UNIQUE) {
            const client = new UniqueNftClient(env.UNIQUE_NETWORK_API_URL);
            const onChainCollection = await client.getCollection(
              collection.contractAddress,
            );
            await NftsService.checkMintConditions(
              body,
              context,
              collection,
              onChainCollection.lastTokenId,
            );

            const conn = await context.mysql.start();
            try {
              const metadata = await new CollectionMetadata(
                {},
                context,
              ).getNextTokens(collection.id, body.quantity, conn);
              if (metadata.length !== body.quantity) {
                throw new NftsValidationException({
                  code: NftsErrorCode.MINT_NFT_SUPPLY_ERROR,
                  property: 'quantity',
                  message: `Can't mint ${body.quantity} NFTs since only ${metadata.length} metadata rows left.`,
                });
              }
              const mintTokens = await getMintPayload(
                collection,
                body.receivingAddress,
                metadata,
              );
              tokenIds = metadata.map((m) => m.tokenId);
              callMethod = 'mintNFTs';
              callArguments = [collection.contractAddress, mintTokens];
              const serializedTransaction = await client.mintNft(
                collection.contractAddress,
                mintTokens,
              );
              const result = await NftsService.sendTransaction(
                context,
                collection,
                TransactionType.MINT_NFT,
                serializedTransaction,
                spendCredit.referenceId,
                minimumGas,
                conn,
              );
              await new CollectionMetadata({}, context).markTokensAsMinted(
                collection.id,
                tokenIds,
                conn,
              );
              await context.mysql.commit(conn);
              return result;
            } catch (e) {
              await context.mysql.rollback(conn);
              if (e instanceof HttpException) {
                throw e;
              }
              throw new NftsCodeException({
                status: 500,
                code: NftsErrorCode.MINT_NFT_ERROR,
                context,
                errorMessage: `Failed to mint NFT(s) via unique: ${e.message}`,
              });
            }
          } else {
            const { abi } = await new ContractVersion(
              {},
              context,
            ).getContractVersion(
              collection.collectionType,
              collection.chainType,
            );
            const substrateContractClient = await getSubstrateContractClient(
              context,
              collection.chain as SubstrateChain,
              JSON.parse(abi),
              collection.contractAddress,
            );
            try {
              const minted =
                await substrateContractClient.query<number>(
                  'psp34::totalSupply',
                );
              await NftsService.checkMintConditions(
                body,
                context,
                collection,
                minted,
              );
              callMethod = 'launchpad::mintProject';
              callArguments = [body.receivingAddress, body.quantity];
              const tx = await substrateContractClient.createTransaction(
                callMethod,
                callArguments,
                collection.deployerAddress,
              );
              serializedTransaction = tx.toHex();
            } finally {
              await substrateContractClient.destroy();
            }
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
        callMethod,
        callArguments,
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

  /**
   * Mint child and nest it under parent NFT collection
   * @param body
   * @param context
   */
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
    if (
      parentCollection.chainType === ChainType.SUBSTRATE &&
      parentCollection.chain !== SubstrateChain.UNIQUE
    ) {
      throw new NftsCodeException({
        status: 501,
        code: NftsErrorCode.ACTION_NOT_SUPPORTED,
        context,
      });
    }
    // only RMRK NFTs can be used for nesting
    if (parentCollection.collectionType !== NFTCollectionType.NESTABLE) {
      throw new NftsValidationException({
        code: NftsErrorCode.COLLECTION_TYPE_NOT_VALID,
        property: 'parentCollectionUuid',
      });
    }

    const childCollection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);
    // only RMRK NFTs can be nest minted
    if (childCollection.collectionType !== NFTCollectionType.NESTABLE) {
      throw new NftsValidationException({
        code: NftsErrorCode.COLLECTION_TYPE_NOT_VALID,
        property: 'collection_uuid',
      });
    }

    if (parentCollection.chain !== childCollection.chain) {
      throw new NftsValidationException({
        code: NftsErrorCode.COLLECTION_PARENT_AND_CHILD_NFT_CHAIN_MISMATCH,
        property: 'collection_uuid',
      });
    }

    // checks if we can mint child collection
    await NftsService.checkCollection(childCollection, sourceFunction, context);

    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.NFT_ETHEREUM_MINT,
      [EvmChain.SEPOLIA]: ProductCode.NFT_SEPOLIA_MINT,
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_MINT,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_MINT,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_MINT,
      [EvmChain.BASE]: ProductCode.NFT_BASE_MINT,
      [EvmChain.BASE_SEPOLIA]: ProductCode.NFT_BASE_SEPOLIA_MINT,
      [SubstrateChain.UNIQUE]: ProductCode.NFT_UNIQUE_MINT,
    }[childCollection.chain];
    const spendCredit = new SpendCreditDto(
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

    const { data } = await spendCreditAction(context, spendCredit, async () => {
      let txData: string, callMethod: string, callArguments: unknown[];
      switch (parentCollection.chainType) {
        case ChainType.EVM: {
          // on-chain checks for child collection
          const childAbi = await new ContractVersion(
            {},
            context,
          ).getContractAbi(
            childCollection.collectionType,
            childCollection.contractVersion_id,
          );
          const childEvmContractClient = await getEvmContractClient(
            context,
            childCollection.chain as EvmChain,
            childAbi,
            childCollection.contractAddress,
          );
          const isChildNestable = await childEvmContractClient.query<boolean>(
            'supportsInterface',
            ['0x42b0e56f'],
          );
          if (!isChildNestable) {
            throw new NftsCodeException({
              status: 500,
              code: NftsErrorCode.COLLECTION_NOT_NESTABLE,
              context,
              sourceFunction: 'nestMintNftTo()',
            });
          }
          let minted: number;
          if (
            (childCollection.collectionStatus != CollectionStatus.DEPLOYED &&
              childCollection.collectionStatus !=
                CollectionStatus.TRANSFERED) ||
            !childCollection.contractAddress
          ) {
            minted = 0;
          } else {
            const totalSupply =
              await childEvmContractClient.query<BigNumber>('totalSupply');
            minted = parseInt(totalSupply._hex, 16);
          }
          await NftsService.checkNestMintConditions(
            body,
            context,
            childCollection,
            minted,
          );

          callMethod = 'ownerNestMint';
          callArguments = [
            parentCollection.contractAddress,
            body.quantity,
            body.parentNftId,
          ];
          txData = await childEvmContractClient.createTransaction(
            callMethod,
            callArguments,
          );
          break;
        }
        case ChainType.SUBSTRATE: {
          const client = new UniqueNftClient(env.UNIQUE_NETWORK_API_URL);
          const receivingAddress = client.getTokenAddress(
            parentCollection.contractAddress,
            body.parentNftId,
          );
          const onChainChildCollection = await client.getCollection(
            childCollection.contractAddress,
          );
          await NftsService.checkNestMintConditions(
            body,
            context,
            childCollection,
            onChainChildCollection.lastTokenId,
          );

          // transaction to revert metadata used in case of failed mint
          const conn = await context.mysql.start();
          try {
            const metadata = await new CollectionMetadata(
              {},
              context,
            ).getNextTokens(childCollection.id, body.quantity, conn);
            const mintTokens = await getMintPayload(
              childCollection,
              receivingAddress,
              metadata,
            );
            callMethod = 'mintNFTs';
            callArguments = [childCollection.contractAddress, mintTokens];
            const serializedTransaction = await client.mintNft(
              childCollection.contractAddress,
              mintTokens,
            );
            const result = await NftsService.sendTransaction(
              context,
              childCollection,
              TransactionType.NEST_MINT_NFT,
              callMethod,
              callArguments,
              serializedTransaction,
              spendCredit.referenceId,
              null,
              conn,
            );
            await new CollectionMetadata({}, context).markTokensAsMinted(
              childCollection.id,
              metadata.map((m) => m.tokenId),
              conn,
            );
            await context.mysql.commit(conn);
            return result;
          } catch (e) {
            await context.mysql.rollback(conn);
            throw new NftsCodeException({
              status: 500,
              code: NftsErrorCode.NEST_MINT_NFT_ERROR,
              context,
              errorMessage: `Failed to nest mint NFT(s) via unique: ${e.message}`,
            });
          }
        }
        default: {
          throw new NftsCodeException({
            status: 501,
            code: NftsErrorCode.ACTION_NOT_SUPPORTED,
            context,
          });
        }
      }
      return await NftsService.sendTransaction(
        context,
        childCollection,
        TransactionType.NEST_MINT_NFT,
        callMethod,
        callArguments,
        txData,
        spendCredit.referenceId,
      );
    });

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
      `Burning NFT token (collection uuid=${body.collection_uuid}), tokenId=${body.tokenId})`,
    );
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(body.collection_uuid);
    await NftsService.checkCollection(collection, 'burnNftToken()', context);

    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.NFT_ETHEREUM_BURN,
      [EvmChain.SEPOLIA]: ProductCode.NFT_SEPOLIA_BURN,
      [EvmChain.MOONBASE]: ProductCode.NFT_MOONBASE_BURN,
      [EvmChain.MOONBEAM]: ProductCode.NFT_MOONBEAM_BURN,
      [EvmChain.ASTAR]: ProductCode.NFT_ASTAR_BURN,
      [EvmChain.BASE]: ProductCode.NFT_BASE_BURN,
      [EvmChain.BASE_SEPOLIA]: ProductCode.NFT_BASE_SEPOLIA_BURN,
      [SubstrateChain.ASTAR]: ProductCode.NFT_ASTAR_WASM_BURN,
      [SubstrateChain.UNIQUE]: ProductCode.NFT_UNIQUE_BURN,
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
        const chainName = getChainName(collection.chainType, collection.chain);
        console.info(
          `[${chainName}] Creating NFT burn transaction from wallet address: ${
            collection.deployerAddress
          }, parameters=${JSON.stringify(collection)}`,
        );
        let txHash: string, callMethod: string, callArguments: unknown[];
        switch (collection.chainType) {
          case ChainType.EVM: {
            const { abi } = await new ContractVersion({}, context).populateById(
              collection.contractVersion_id,
            );
            const evmContractClient = await getEvmContractClient(
              context,
              collection.chain as EvmChain,
              abi,
              collection.contractAddress,
            );
            callArguments = [body.tokenId];
            if (collection.collectionType === NFTCollectionType.NESTABLE) {
              callArguments.push(EVM_MAX_INT);
            }
            callMethod = 'burn';
            txHash = await evmContractClient.createTransaction(
              callMethod,
              callArguments,
            );
            break;
          }
          case ChainType.SUBSTRATE: {
            // Astar WASM contract doesnt implement burning for contract owner
            if (collection.chain !== SubstrateChain.UNIQUE) {
              throw new Error(
                `Support for substrate chain ${collection.chain} not implemented`,
              );
            }
            const client = new UniqueNftClient(env.UNIQUE_NETWORK_API_URL);
            try {
              const token = await client.getCollectionToken(
                collection.contractAddress,
                body.tokenId,
              );
              callMethod = 'burn';
              callArguments = [
                collection.contractAddress,
                body.tokenId,
                token.owner,
              ];
              txHash = await client.burnNft(
                collection.contractAddress,
                body.tokenId,
                token.owner,
              );
            } catch (err: unknown) {
              throw new NftsCodeException({
                code: NftsErrorCode.BURN_NFT_ERROR,
                status: 404,
                errorMessage: `Token with id ${body.tokenId} doesn't exist on collection with id ${collection.contractAddress}: ${err}`,
              });
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
          TransactionType.BURN_NFT,
          callMethod,
          callArguments,
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

    collection.canAccess(context);

    return await collection.markArchived();
  }

  /**
   * Set a collection's status to active
   * @param {{ collecton_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<Collection>}
   */
  static async activateCollection(
    event: { collection_uuid: string },
    context: ServiceContext,
  ): Promise<Collection> {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(event.collection_uuid);

    collection.canAccess(context);

    return await collection.markActive();
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
        status: 400,
        code: NftsErrorCode.NFT_CONTRACT_STATUS_ERROR,
        context,
        sourceFunction,
      });
    }

    // If not the collection which gets minted from landing page, check access
    if (collection.collection_uuid !== env.DEMO_NFT_COLLECTION_UUID)
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
      throw new NftsValidationException({
        code: NftsErrorCode.MINT_IDS_LENGTH_NOT_VALID,
        property: 'idsToMint',
      });
    }
  }

  private static async checkNestMintConditions(
    params: NestMintNftDTO,
    context: ServiceContext,
    childCollection: Collection,
    minted: number,
  ) {
    if (childCollection.maxSupply == 0) {
      return true;
    }

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

  static async maxCollectionsQuotaReached(
    event: { query: CollectionsQuotaReachedQueryFilter },
    context: ServiceContext,
  ) {
    const collection: Collection = new Collection(
      { project_uuid: event.query.project_uuid },
      context,
    );

    const ethereumCollectionsCount = await collection.getChainCollectionsCount(
      ChainType.EVM,
      EvmChain.ETHEREUM,
    );
    const maxCollectionsQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_ETHEREUM_NFT_COLLECTIONS,
      project_uuid: collection.project_uuid,
    });

    return {
      maxEthereumQuotaReached:
        ethereumCollectionsCount >= maxCollectionsQuota.value,
    };
  }

  /**
   * Sends a transaction through a blockchain service based on the chain type of the collection.
   *
   * @param context - The service context used for managing backend services and database transactions.
   * @param collection - The collection data containing details such as chain, deployerAddress, and chainType.
   * @param transactionType - The type of transaction to be performed, such as minting or transferring.
   * @param txHash - The transaction hash representing the blockchain transaction identifier.
   * @param transaction_uuid - The unique identifier for the transaction in the system.
   * @param [minimumGas] - Optional parameter representing the minimum gas required for the transaction.
   * @param [connIn] - Optional database connection passed to manage transactional integrity.
   * @return A promise that resolves to an object containing the transaction details.
   */
  private static async sendTransaction(
    context: ServiceContext,
    collection: Collection,
    transactionType: TransactionType,
    callMethod: string,
    callArguments: unknown[],
    txHash: string,
    transaction_uuid: string,
    minimumGas?: number,
    connIn?: PoolConnection,
  ): Promise<{ data: TransactionDto }> {
    // reuse old connection if present and skip commit and rollback (they are
    // called after this function is called) if that is the case
    const conn = connIn ?? (await context.mysql.start());
    try {
      const data = {
        chain: collection.chain,
        transaction: txHash,
        fromAddress: collection.deployerAddress,
        referenceTable: DbTables.COLLECTION,
        referenceId: collection.id,
        project_uuid: collection.project_uuid,
        minimumGas: minimumGas ?? undefined,
      };
      const blockchainService = new BlockchainMicroservice(context);
      let response: { data: TransactionDto };
      switch (collection.chainType) {
        case ChainType.EVM: {
          response = await blockchainService.createEvmTransaction(
            new CreateEvmTransactionDto(data),
          );
          break;
        }
        case ChainType.SUBSTRATE: {
          response = await blockchainService.createSubstrateTransaction(
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
            callMethod,
            callArguments,
          },
          context,
        ),
        conn,
      );
      if (!connIn) {
        await context.mysql.commit(conn);
      }

      return response;
    } catch (err) {
      if (!connIn) {
        await context.mysql.rollback(conn);
      }
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

  //#REGION PRIVATE METHODS

  /**
   * Only projects with specific plan and available quota can crate Ethereum and Sepolia NFTs
   *
   * @param context
   * @param chainType
   * @param chain
   * @param project_uuid
   */
  private static async assertIsAllowedToCreateNftCollection(
    context: Context,
    chainType: ChainType,
    chain: Chain,
    project_uuid: string,
  ) {
    if (
      chainType !== ChainType.EVM ||
      !ENTERPRISE_USER_EVM_CHAINS.includes(chain as EvmChain)
    ) {
      return;
    }

    const { data } = await new Scs(context).getProjectActiveSubscription(
      project_uuid,
    );

    if (
      !data.package_id ||
      data.package_id !== SubscriptionPackageId.BUTTERFLY
    ) {
      throw new NftsCodeException({
        status: 402,
        code: NftsErrorCode.REQUIRES_BUTTERFLY_PLAN,
        context,
      });
    }

    // check quota for Ethereum chain only
    if (chain !== EvmChain.ETHEREUM) {
      return;
    }

    const chainCollectionsCount = await new Collection(
      {},
      context,
    ).getChainCollectionsCount(chainType, chain, project_uuid);
    const maxCollectionsQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_ETHEREUM_NFT_COLLECTIONS,
      project_uuid,
    });

    if (chainCollectionsCount >= maxCollectionsQuota.value) {
      throw new NftsCodeException({
        status: 403,
        code: NftsErrorCode.ETHEREUM_COLLECTION_QUOTA_REACHED,
        context,
      });
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

async function getMintPayload(
  collection: Collection,
  receivingAddress: string,
  metadata: CollectionMetadata[],
) {
  const mintTokens = [];
  const royalties =
    collection.royaltiesAddress && collection.royaltiesFees
      ? [
          {
            address: collection.royaltiesAddress,
            percent: collection.royaltiesFees,
          },
        ]
      : [];
  for (const tokenData of metadata) {
    mintTokens.push({
      owner: receivingAddress,
      data: {
        name: tokenData.metadata.name ?? undefined,
        description: tokenData.metadata.description ?? undefined,
        image: tokenData.metadata.image,
        // image_details: {
        //   name: "Artwork",
        //   type: "image",
        //   format: "PNG",
        //   bytes: 1048576,
        //   width: 1000,
        //   height: 1000,
        //   sha256: "0x1234...",
        // }
        attributes: tokenData.metadata.attributes,
        royalties,
      },
      //properties: [{ key: 'A', value: 'value A' }],
    });
  }
  return mintTokens;
}
