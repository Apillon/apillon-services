import {
  Context,
  env,
  LogType,
  StorageMicroservice,
  writeLog,
} from '@apillon/lib';
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
    console.info('RUN EXECUTOR (DeployCollectionWorker). data: ', data);
    //Prepare data and execute validations
    if (!data?.collection_uuid || !data?.baseUri) {
      throw new NftsCodeException({
        code: NftsErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    const collection: Collection = await new Collection(
      {},
      this.context,
    ).populateByUUID(data.collection_uuid);

    if (!collection.exists()) {
      throw new NftsCodeException({
        status: 404,
        code: NftsErrorCode.COLLECTION_NOT_FOUND,
        context: this.context,
      });
    }
    if (
      collection.collectionStatus == CollectionStatus.DEPLOYING ||
      collection.collectionStatus == CollectionStatus.DEPLOYED
    ) {
      throw new NftsCodeException({
        status: 400,
        code: NftsErrorCode.COLLECTION_ALREADY_DEPLOYED,
        context: this.context,
      });
    }

    collection.collectionStatus = CollectionStatus.DEPLOYING;
    collection.baseUri = data.baseUri;
    await collection.update();

    try {
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
    } catch (err) {
      //Update collection status to error
      try {
        collection.collectionStatus = CollectionStatus.FAILED;
        await collection.update();
      } catch (updateError) {
        writeLog(
          LogType.ERROR,
          'Error updating collection status to FAILED.',
          'deploy-collection-worker.ts',
          'runExecuter',
          updateError,
        );
      }
      throw err;
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `DeployCollectionWorker worker has been completed!`,
    );

    return true;
  }
}
