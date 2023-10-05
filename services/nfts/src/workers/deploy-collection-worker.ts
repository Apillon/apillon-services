import {
  AppEnvironment,
  Context,
  env,
  LogType,
  Scs,
  ServiceName,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
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
    // console.info('RUN EXECUTOR (DeployCollectionWorker). data: ', data);
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
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: 'Collection does not exists.',
          service: ServiceName.STORAGE,
        },
        LogOutput.SYS_ERROR,
      );
      return;
    }
    if (
      collection.collectionStatus == CollectionStatus.DEPLOYING ||
      collection.collectionStatus == CollectionStatus.DEPLOYED
    ) {
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: 'Collection already deployed.',
          service: ServiceName.STORAGE,
        },
        LogOutput.SYS_ERROR,
      );
      return;
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
        }).writeToMonitor({ project_uuid: collection.project_uuid });
      }
    } catch (err) {
      //Update collection status to error
      try {
        collection.collectionStatus = CollectionStatus.FAILED;
        await collection.update();
      } catch (updateError) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            project_uuid: collection?.project_uuid,
            message: 'Error updating collection status to FAILED.',
            service: ServiceName.NFTS,
            err: updateError,
            data: {
              collection: collection.serialize(),
            },
          },
          LogOutput.SYS_ERROR,
        );
      }

      //Refund credit
      try {
        await new Scs(this.context).refundCredit(
          'collection',
          data.collection_uuid,
        );
      } catch (refoundError) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: 'Error refunding credit',
            service: ServiceName.STORAGE,
            err: refoundError,
            data: data,
          },
          LogOutput.NOTIFY_ALERT,
        );
      }

      if (
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
      ) {
        throw err;
      }
    }
    return true;
  }
}
