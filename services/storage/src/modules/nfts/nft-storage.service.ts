import { AppEnvironment, env } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { IPFSService } from '../ipfs/ipfs.service';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';
import { PrepareMetadataForCollectionWorker } from '../../workers/prepare-metada-for-collection-worker';

export class NftStorageService {
  static async prepareMetadataForCollection(
    event: {
      body: {
        collection_uuid: string;
        imagesSession: string;
        metadataSession: string;
      };
    },
    context: ServiceContext,
  ) {
    console.info('prepareMetadataForCollection initiated', event);

    //Create initial CID for this collection - IPNS Publish does not work otherwise
    const ipfsRes = await IPFSService.addFileToIPFS({
      path: '',
      content: `NFT Collection metadata. Collection uuid: ${event.body.collection_uuid}`,
    });
    //Prepare IPNS, and start worker which will prepare images and metadata
    const ipns = await IPFSService.publishToIPNS(
      ipfsRes.cidV0,
      event.body.collection_uuid,
    );

    if (
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      //Directly calls worker, to sync files to IPFS & CRUST - USED ONLY FOR DEVELOPMENT!!
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };
      const parameters = {
        collection_uuid: event.body.collection_uuid,
        imagesSession: event.body.imagesSession,
        metadataSession: event.body.metadataSession,
      };
      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.PREPARE_METADATA_FOR_COLLECTION_WORKER,
        {
          parameters,
        },
      );

      const worker = new PrepareMetadataForCollectionWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor({
        collection_uuid: event.body.collection_uuid,
        imagesSession: event.body.imagesSession,
        metadataSession: event.body.metadataSession,
      });
    } else {
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.PREPARE_METADATA_FOR_COLLECTION_WORKER,
        [
          {
            collection_uuid: event.body.collection_uuid,
            imagesSession: event.body.imagesSession,
            metadataSession: event.body.metadataSession,
          },
        ],
        null,
        null,
      );
    }

    return {
      baseUri:
        env.STORAGE_IPFS_GATEWAY.replace('/ipfs/', '/ipns/') + ipns.name + '/',
    };
  }
}
