import {
  AppEnvironment,
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
    let ipnsDbRecord: Ipns = null;
    let baseUri = '';

    if (event.body.useApillonIpfsGateway) {
      //Create initial CID for this collection - IPNS Publish does not work otherwise
      const ipfsRes = await ipfsService.addFileToIPFS({
        path: '',
        content: `NFT Collection metadata. Collection uuid: ${event.body.collection_uuid}`,
      });

      //Add IPNS record to bucket
      ipnsDbRecord = await new Ipns({}, context).populateByBucketAndName(
        bucket.bucket_uuid,
        `${event.body.collectionName} IPNS Record`,
      );

      if (!ipnsDbRecord.exists()) {
        ipnsDbRecord = new Ipns({}, context).populate({
          project_uuid: bucket.project_uuid,
          bucket_id: bucket.id,
          name: `${event.body.collectionName} IPNS Record`,
          status: SqlModelStatus.ACTIVE,
        });
        await ipnsDbRecord.insert();
      }

      //Publish IPNS
      const publishedIpns = await ipfsService.publishToIPNS(
        ipfsRes.cidV0,
        `${ipnsDbRecord.project_uuid}_${ipnsDbRecord.bucket_id}_${ipnsDbRecord.id}`,
      );

      ipnsDbRecord.ipnsName = publishedIpns.name;
      ipnsDbRecord.ipnsValue = publishedIpns.value;
      ipnsDbRecord.key = `${ipnsDbRecord.project_uuid}_${ipnsDbRecord.bucket_id}_${ipnsDbRecord.id}`;
      ipnsDbRecord.cid = ipfsRes.cidV0;
      ipnsDbRecord.status = SqlModelStatus.ACTIVE;

      await ipnsDbRecord.update(SerializeFor.UPDATE_DB);

      //Get IPFS cluster
      const ipfsCluster = await new ProjectConfig(
        { project_uuid: bucket.project_uuid },
        context,
      ).getIpfsCluster();

      baseUri = await ipfsCluster.generateLink(
        bucket.project_uuid,
        publishedIpns.name,
        true,
      );
    }

    //Create collection metadata db record
    const collectionMetadata = await new CollectionMetadata(
      {
        ...event.body,
        bucket_uuid: bucket.bucket_uuid,
        ipnsId: ipnsDbRecord.id,
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
      });

      if (event.body.useApillonIpfsGateway) {
        //Call NFTs MS function, which will trigger deploy collection worker.
        //If not using apillon ipfs gateway, this will be triggered when metadata is prepared
        await new NftsMicroservice(context).executeDeployCollectionWorker({
          collection_uuid: event.body.collection_uuid,
          baseUri,
        });
      }
    } else {
      //send messages to sqs
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.PREPARE_METADATA_FOR_COLLECTION_WORKER,
        [
          {
            collectionMetadataId: collectionMetadata.id,
          },
        ],
        null,
        null,
      );

      //If not using apillon ipfs gateway, this will be triggered when metadata is prepared
      if (event.body.useApillonIpfsGateway) {
        await sendToWorkerQueue(
          env.NFTS_AWS_WORKER_SQS_URL,
          'DeployCollectionWorker',
          [
            {
              collection_uuid: event.body.collection_uuid,
              baseUri,
            },
          ],
          null,
          null,
        );
      }
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
