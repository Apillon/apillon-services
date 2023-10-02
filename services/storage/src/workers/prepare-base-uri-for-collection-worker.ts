import {
  AppEnvironment,
  Context,
  env,
  LogType,
  NftsMicroservice,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { addJwtToIPFSUrl } from '../lib/ipfs-utils';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { ProjectConfig } from '../modules/config/models/project-config.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { Ipns } from '../modules/ipns/models/ipns.model';
import { PrepareMetadataForCollectionWorker } from './prepare-metada-for-collection-worker';
import { WorkerName } from './worker-executor';

export class PrepareBaseUriForCollectionWorker extends BaseQueueWorker {
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
  public async runExecutor(data: {
    bucket_uuid: string;
    collection_uuid: string;
    collectionName: string;
    imagesSession: string;
    metadataSession: string;
  }): Promise<any> {
    console.info(
      'RUN EXECUTOR (PrepareBaseUriForCollectionWorker). data: ',
      data,
    );

    const bucket: Bucket = await new Bucket({}, this.context).populateByUUID(
      data.bucket_uuid,
    );

    const ipfsService = new IPFSService(this.context, bucket.project_uuid);

    //Create initial CID for this collection - IPNS Publish does not work otherwise
    const ipfsRes = await ipfsService.addFileToIPFS({
      path: '',
      content: `NFT Collection metadata. Collection uuid: ${data.collection_uuid}`,
    });

    //Add IPNS record to bucket
    let ipnsDbRecord = await new Ipns(
      {},
      this.context,
    ).populateByProjectAndName(
      bucket.project_uuid,
      `${data.collectionName} IPNS Record`,
    );

    if (!ipnsDbRecord.exists()) {
      ipnsDbRecord = new Ipns({}, this.context).populate({
        project_uuid: bucket.project_uuid,
        bucket_id: bucket.id,
        name: `${data.collectionName} IPNS Record`,
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

    //Get IPFS gateway
    const ipfsGateway = await new ProjectConfig(
      { project_uuid: bucket.project_uuid },
      this.context,
    ).getIpfsGateway();

    let baseUri = ipfsGateway.ipnsUrl + publishedIpns.name + '/';

    if (ipfsGateway.private) {
      baseUri = addJwtToIPFSUrl(baseUri, bucket.project_uuid);
    }

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
        collection_uuid: data.collection_uuid,
        imagesSession: data.imagesSession,
        metadataSession: data.metadataSession,
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
        this.context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor({
        collection_uuid: data.collection_uuid,
        imagesSession: data.imagesSession,
        metadataSession: data.metadataSession,
        ipnsId: ipnsDbRecord.id,
      });

      //Call NFTs MS function, which will trigger deploy collection worker
      await new NftsMicroservice(this.context).executeDeployCollectionWorker({
        collection_uuid: data.collection_uuid,
        baseUri,
      });
    } else {
      //send messages to sqs
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.PREPARE_METADATA_FOR_COLLECTION_WORKER,
        [
          {
            collection_uuid: data.collection_uuid,
            imagesSession: data.imagesSession,
            metadataSession: data.metadataSession,
            ipnsId: ipnsDbRecord.id,
          },
        ],
        null,
        null,
      );

      await sendToWorkerQueue(
        env.NFTS_AWS_WORKER_SQS_URL,
        'DeployCollectionWorker',
        [
          {
            collection_uuid: data.collection_uuid,
            baseUri,
          },
        ],
        null,
        null,
      );
    }

    await this.writeEventLog({
      logType: LogType.INFO,
      project_uuid: bucket.project_uuid,
      message: 'PrepareBaseUriForCollectionWorker worker has been completed!',
      service: ServiceName.STORAGE,
    });

    return true;
  }
}
