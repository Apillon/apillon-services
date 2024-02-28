import { AWS_S3, DefaultUserRole } from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import fs from 'fs';
import request from 'supertest';
import { v4 as uuidV4 } from 'uuid';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { BucketType } from '../../config/types';
import { createFURAndS3Url } from '../../lib/create-fur-and-s3-url';
import { Bucket } from '../../modules/bucket/models/bucket.model';
import { Ipns } from '../../modules/ipns/models/ipns.model';
import { FileUploadRequest } from '../../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../../modules/storage/models/file-upload-session.model';
import { File } from '../../modules/storage/models/file.model';
import { PrepareMetadataForCollectionWorker } from '../prepare-metada-for-collection-worker';
import { IPFSService } from '../../modules/ipfs/ipfs.service';
import { Directory } from '../../modules/directory/models/directory.model';

describe('PrepareMetadataForCollectionWorker integration test', () => {
  let stage: Stage;
  const s3Client: AWS_S3 = new AWS_S3();

  let worker: PrepareMetadataForCollectionWorker;
  const project_uuid = uuidV4();

  let collectionBucket: Bucket;
  let collectionIpns: Ipns;

  const nftImagesPayload = {
    bucket_uuid: undefined,
    session_uuid: uuidV4(),
    files: [
      {
        fileName: '1.png',
      },
      {
        fileName: '2.png',
      },
    ],
  };
  const nftMetadataPayload = {
    bucket_uuid: undefined,
    session_uuid: uuidV4(),
    files: [
      {
        fileName: '1.json',
      },
      {
        fileName: '2.json',
      },
    ],
  };

  let imageSession: FileUploadSession;
  let metadataSession: FileUploadSession;

  beforeAll(async () => {
    stage = await setupTest();
    stage.context.user = {
      userRoles: [DefaultUserRole.ADMIN],
    };

    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-ipfs-bandwidth-worker',
      { parameters: {} },
    );
    worker = new PrepareMetadataForCollectionWorker(
      workerDefinition,
      stage.context,
      QueueWorkerType.EXECUTOR,
    );

    //create bucket
    collectionBucket = await new Bucket({}, stage.context)
      .fake()
      .populate({
        name: 'Test collection bucket',
        project_uuid,
        bucketType: BucketType.NFT_METADATA,
      })
      .insert();

    //create ipns
    collectionIpns = await new Ipns(
      {
        ipns_uuid: uuidV4(),
        project_uuid,
        bucket_id: collectionBucket.id,
        name: 'Test collection IPNS',
        key: uuidV4(),
      },
      stage.context,
    );

    //publish ipns to dummy CID
    const publishRes = await new IPFSService(
      stage.context,
      project_uuid,
    ).publishToIPNS(
      'bafkreigyq6zcb6ek7gm2gpcbexqjiy6yh62ajfgnunqi63crxskmidp4j4',
      collectionIpns.key,
    );

    collectionIpns.ipnsName = publishRes.name;
    collectionIpns.ipnsValue = publishRes.value;

    await collectionIpns.insert();

    nftImagesPayload.bucket_uuid = collectionBucket.bucket_uuid;
    nftMetadataPayload.bucket_uuid = collectionBucket.bucket_uuid;
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test create image session and upload images to s3', async () => {
    //Create session
    imageSession = await new FileUploadSession(
      { session_uuid: uuidV4, bucket_id: collectionBucket.id },
      stage.context,
    ).insert();
    const image1Fur = new FileUploadRequest(
      {
        session_id: imageSession.id,
        bucket_id: collectionBucket.id,
        fileName: '1.png',
        contentType: 'image/png',
      },
      stage.context,
    );
    await createFURAndS3Url(
      stage.context,
      `NFT_METADATA_sessions/${collectionBucket.id}/${imageSession.session_uuid}/1.png`,
      image1Fur,
      imageSession,
      collectionBucket,
      s3Client,
    );

    //Upload images to s3
    let uploadRes = await request(image1Fur.url)
      .put('')
      .send(await fs.readFileSync('test/test-files/1.png'));

    expect(uploadRes.status).toBe(200);

    const image2Fur = new FileUploadRequest(
      {
        session_id: imageSession.id,
        bucket_id: collectionBucket.id,
        fileName: '2.png',
        contentType: 'image/png',
      },
      stage.context,
    );
    await createFURAndS3Url(
      stage.context,
      `NFT_METADATA_sessions/${collectionBucket.id}/${imageSession.session_uuid}/2.png`,
      image2Fur,
      imageSession,
      collectionBucket,
      s3Client,
    );

    //Upload images to s3
    uploadRes = await request(image2Fur.url)
      .put('')
      .send(await fs.readFileSync('test/test-files/2.png'));

    expect(uploadRes.status).toBe(200);
  });

  test('Test create metadata session and upload images to s3', async () => {
    //Create session
    metadataSession = await new FileUploadSession(
      { session_uuid: uuidV4, bucket_id: collectionBucket.id },
      stage.context,
    ).insert();
    const metadata1Fur = new FileUploadRequest(
      {
        session_id: metadataSession.id,
        bucket_id: collectionBucket.id,
        fileName: '1.json',
        contentType: 'application/json',
      },
      stage.context,
    );
    await createFURAndS3Url(
      stage.context,
      `NFT_METADATA_sessions/${collectionBucket.id}/${metadataSession.session_uuid}/1.json`,
      metadata1Fur,
      metadataSession,
      collectionBucket,
      s3Client,
    );

    //Upload json to s3
    let uploadRes = await request(metadata1Fur.url).put('').send({
      name: 'Nft 1',
      description: 'Nft 1 description',
      image: '1.png',
    });

    expect(uploadRes.status).toBe(200);

    const metadata2Fur = new FileUploadRequest(
      {
        session_id: metadataSession.id,
        bucket_id: collectionBucket.id,
        fileName: '2.json',
        contentType: 'application/json',
      },
      stage.context,
    );
    await createFURAndS3Url(
      stage.context,
      `NFT_METADATA_sessions/${collectionBucket.id}/${metadataSession.session_uuid}/2.json`,
      metadata2Fur,
      metadataSession,
      collectionBucket,
      s3Client,
    );

    //Upload json to s3
    uploadRes = await request(metadata2Fur.url).put('').send({
      name: 'Nft 2',
      description: 'Nft 2 description',
      image: '2.png',
    });

    expect(uploadRes.status).toBe(200);
  });

  test('Test prepare metadata for collection worker', async () => {
    await worker.run({
      executeArg: JSON.stringify({
        collection_uuid: uuidV4(),
        imagesSession: imageSession.session_uuid,
        metadataSession: metadataSession.session_uuid,
        ipnsId: collectionIpns.id,
        useApillonIpfsGateway: true,
      }),
    });

    //check files in bucket
    const filesInBucket = await new File(
      {},
      stage.context,
    ).populateFilesInBucket(collectionBucket.id, stage.context);

    expect(filesInBucket.length).toBe(4);

    const tmpImageFile = filesInBucket.find((x) => x.name == '1.png');
    expect(tmpImageFile).toBeTruthy();
    expect(tmpImageFile.CID).toBeTruthy();
    expect(tmpImageFile.CIDv1).toBeTruthy();

    const tmpMetadataFile = filesInBucket.find((x) => x.name == '1.json');
    expect(tmpMetadataFile).toBeTruthy();
    expect(tmpMetadataFile.CID).toBeTruthy();
    expect(tmpMetadataFile.CIDv1).toBeTruthy();
    expect(tmpMetadataFile.path).toMatch('Metadata');

    //get metadata directory
    const directories = await new Directory(
      {},
      stage.context,
    ).populateDirectoriesInBucket(collectionBucket.id, stage.context);

    expect(directories.length).toBe(1);

    //check ipns
    const tmpIpns = await new Ipns({}, stage.context).populateById(
      collectionIpns.id,
    );
    expect(tmpIpns.ipnsName).toBe(collectionIpns.ipnsName);
    expect(tmpIpns.ipnsValue).toMatch(directories[0].CIDv1);
  });
});
