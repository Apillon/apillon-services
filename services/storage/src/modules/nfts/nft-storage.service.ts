import {
  AppEnvironment,
  CreateIpnsDto,
  NftsMicroservice,
  SerializeFor,
  SqlModelStatus,
  env,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import { getSessionFilesOnS3 } from '../../lib/file-upload-session-s3-files';
import { PrepareMetadataForCollectionWorker } from '../../workers/prepare-metada-for-collection-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Bucket } from '../bucket/models/bucket.model';
import { ProjectConfig } from '../config/models/project-config.model';
import { IPFSService } from '../ipfs/ipfs.service';
import { Ipns } from '../ipns/models/ipns.model';
import { StorageService } from '../storage/storage.service';
import { CollectionMetadata } from './modules/collection-metadata.model';
import { CollectionMetadataQueryFilter } from '@apillon/lib';
import { IpnsService } from '../ipns/ipns.service';

export class NftStorageService {
  static async prepareBaseUriForCollection(
    event: {
      body: {
        bucket_uuid: string;
        collection_uuid: string;
        collectionName: string;
        imagesSession: string;
        metadataSession: string;
        useApillonIpfsGateway: boolean;
        useIpns: boolean;
      };
    },
    context: ServiceContext,
  ) {
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      event.body.bucket_uuid,
    );

    //Size of images and metadata for collection.
    const imagesOnS3 = await getSessionFilesOnS3(
      bucket,
      event.body.imagesSession,
    );
    const metadataOnS3 = await getSessionFilesOnS3(
      bucket,
      event.body.metadataSession,
    );

    //Check if enough storage is available
    await StorageService.checkStorageSpace(
      context,
      bucket.project_uuid,
      imagesOnS3.size + metadataOnS3.size,
    );

    const ipfsService = new IPFSService(context, bucket.project_uuid);
    let baseUri = '';
    let collectionMetadata: CollectionMetadata = null;
    let ipns: Ipns = null;

    if (event.body.useIpns) {
      //Create initial CID for this collection - IPNS Publish does not work otherwise
      const ipfsRes = await ipfsService.addFileToIPFS({
        path: '',
        content: `NFT Collection metadata. Collection uuid: ${event.body.collection_uuid}`,
      });

      //Add IPNS record to bucket and publish it
      const createIpnsData = new CreateIpnsDto({}, context).populate({
        bucket_uuid: bucket.bucket_uuid,
        name: `${event.body.collectionName} IPNS Record`,
        cid: ipfsRes.cidV1,
      });
      ipns = await IpnsService.createIpns({ body: createIpnsData }, context);
    }

    //Create collection metadata db record
    collectionMetadata = await new CollectionMetadata(
      {
        ...event.body,
        bucket_uuid: bucket.bucket_uuid,
      },
      context,
    ).insert();

    //Start worker which will prepare images and metadata and deploy contract
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
        collectionMetadataId: collectionMetadata.id,
        useApillonIpfsGateway: event.body.useApillonIpfsGateway,
        ipns_uuid: ipns?.ipns_uuid,
        runDeployCollectionWorker: true,
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
        collectionMetadataId: collectionMetadata.id,
        useApillonIpfsGateway: event.body.useApillonIpfsGateway,
        ipns_uuid: ipns?.ipns_uuid,
        runDeployCollectionWorker: true,
      });
    } else {
      //send messages to sqs
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.PREPARE_METADATA_FOR_COLLECTION_WORKER,
        [
          {
            collectionMetadataId: collectionMetadata.id,
            useApillonIpfsGateway: event.body.useApillonIpfsGateway,
            ipns_uuid: ipns?.ipns_uuid,
            runDeployCollectionWorker: true,
          },
        ],
        null,
        null,
      );
    }

    return { baseUri };
  }

  static async listCollectionMetadata(
    event: { query: CollectionMetadataQueryFilter },
    context: ServiceContext,
  ) {
    return await new CollectionMetadata({}, context).getList(
      context,
      new CollectionMetadataQueryFilter(event.query),
    );
  }
}
