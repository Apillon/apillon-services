import { Context, env, StorageMicroservice } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { CollectionStatus, NftsErrorCode } from '../config/types';
import { NftsCodeException } from '../lib/exceptions';
import { deployNFTCollectionContract } from '../lib/utils/collection-utils';
import { Collection } from '../modules/nfts/models/collection.model';

export class DeployCollectionWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.STORAGE_AWS_WORKER_SQS_URL);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }
  public async runExecutor(data: any): Promise<any> {
    console.info('RUN EXECUTOR (CollectionMetadataWorker). data: ', data);
    if (!data?.collectionId) {
      throw new NftsCodeException({
        code: NftsErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    const collection: Collection = await new Collection(
      {},
      this.context,
    ).populateById(data.collectionId);

    if (!collection.exists()) {
      throw new NftsCodeException({
        status: 404,
        code: NftsErrorCode.COLLECTION_NOT_FOUND,
        context: this.context,
      });
    }
    if (collection.collectionStatus != CollectionStatus.CREATED) {
      throw new NftsCodeException({
        status: 400,
        code: NftsErrorCode.COLLECTION_ALREADY_DEPLOYED,
        context: this.context,
      });
    }

    if (collection.imagesSession && collection.metadataSession) {
      const metadataIpfsCID = (
        await new StorageMicroservice(this.context).prepareCollectionMetadata({
          collection_uuid: collection.collection_uuid,
          imagesSession: collection.imagesSession,
          metadataSession: collection.metadataSession,
        })
      ).data.baseUri;

      collection.baseUri = metadataIpfsCID;
    }

    const conn = await this.context.mysql.start();
    try {
      //Deploy NFT contract
      await deployNFTCollectionContract(this.context, collection, conn);
      await this.context.mysql.commit(conn);
    } catch (err) {
      await this.context.mysql.rollback(conn);

      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.DEPLOY_NFT_CONTRACT_ERROR,
        context: this.context,
        sourceFunction: 'DeployCollectionWorker.runExecutor()',
        errorMessage: 'Error deploying Nft contract',
        details: err,
      }).writeToMonitor({});
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `DeployCollectionWorker worker has been completed!`,
    );

    return true;
  }
}
