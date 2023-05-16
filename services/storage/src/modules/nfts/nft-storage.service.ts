import {
  AppEnvironment,
  SerializeFor,
  SqlModelStatus,
  env,
} from '@apillon/lib';
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
import { Ipns } from '../ipns/models/ipns.model';
import { Bucket } from '../bucket/models/bucket.model';

export class NftStorageService {
  static async prepareMetadataForCollection(
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
    console.info('prepareMetadataForCollection initiated', event);

    //Create initial CID for this collection - IPNS Publish does not work otherwise
    const ipfsRes = await IPFSService.addFileToIPFS({
      path: '',
      content: `NFT Collection metadata. Collection uuid: ${event.body.collection_uuid}`,
    });

    //Add IPNS record to bucket
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      event.body.bucket_uuid,
    );
    const ipnsDbRecord = new Ipns({}, context).populate({
      project_uuid: bucket.project_uuid,
      bucket_id: bucket.id,
      name: event.body.collectionName + ' IPNS Record',
      status: SqlModelStatus.ACTIVE,
    });
    await ipnsDbRecord.insert();

    //Publish IPNS
    const publishedIpns = await IPFSService.publishToIPNS(
      ipfsRes.cidV0,
      `${ipnsDbRecord.project_uuid}_${ipnsDbRecord.bucket_id}_${ipnsDbRecord.id}`,
    );

    ipnsDbRecord.ipnsName = publishedIpns.name;
    ipnsDbRecord.ipnsValue = publishedIpns.value;
    ipnsDbRecord.status = SqlModelStatus.ACTIVE;

    await ipnsDbRecord.update(SerializeFor.UPDATE_DB);

    //Start worker which will prepare images and metadata
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
        ipnsId: ipnsDbRecord.id,
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
        ipnsId: ipnsDbRecord.id,
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
            ipnsId: ipnsDbRecord.id,
          },
        ],
        null,
        null,
      );
    }

    return {
      baseUri:
        env.STORAGE_IPFS_GATEWAY.replace('/ipfs/', '/ipns/') +
        publishedIpns.name +
        '/',
    };
  }
}
