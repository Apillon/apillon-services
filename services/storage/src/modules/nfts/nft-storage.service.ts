import { ServiceContext } from '@apillon/service-lib';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { PrepareMetadataForCollectionWorker } from '../../workers/prepare-metada-for-collection-worker';
import { WorkerName } from '../../workers/worker-executor';
import { PrepareBaseUriForCollectionWorker } from '../../workers/prepare-base-uri-for-collection-worker';

export class NftStorageService {
  static async executePrepareBaseUriForCollectionWorker(
    event: {
      body: {
        bucket_uuid: string;
        collection_uuid: string;
        collectionName: string;
        imagesSession: string;
        metadataSession: string;
      };
    },
    context: ServiceContext,
  ) {
    //Directly calls worker, to prepare baseUri for collection.
    //This Worker also triggers prepareMetadata worker and deploy collection worker in NFTs MS.

    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const parameters = event.body;
    const wd = new WorkerDefinition(
      serviceDef,
      WorkerName.PREPARE_BASE_URI_FOR_COLLECTION_WORKER,
      {
        parameters,
      },
    );

    const worker = new PrepareBaseUriForCollectionWorker(
      wd,
      context,
      QueueWorkerType.EXECUTOR,
    );
    await worker.runExecutor(event.body);

    return { success: true };
  }
}
