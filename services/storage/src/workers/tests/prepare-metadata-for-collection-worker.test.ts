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
import { BucketType, PrepareCollectionMetadataStep } from '../../config/types';
import { createFURAndS3Url } from '../../lib/create-fur-and-s3-url';
import { Bucket } from '../../modules/bucket/models/bucket.model';
import { Directory } from '../../modules/directory/models/directory.model';
import { IPFSService } from '../../modules/ipfs/ipfs.service';
import { Ipns } from '../../modules/ipns/models/ipns.model';
import { CollectionMetadata } from '../../modules/nfts/modules/collection-metadata.model';
import { FileUploadRequest } from '../../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../../modules/storage/models/file-upload-session.model';
import { File } from '../../modules/storage/models/file.model';
import { PrepareMetadataForCollectionWorker } from '../prepare-metada-for-collection-worker';

describe('PrepareMetadataForCollectionWorker integration test', () => {
  let stage: Stage;
  const s3Client: AWS_S3 = new AWS_S3();

  let worker: PrepareMetadataForCollectionWorker;
  const project_uuid = uuidV4();

  let collectionBucket: Bucket;
  let collectionIpns: Ipns;

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
    const collectionMetadata = await new CollectionMetadata(
      {
        bucket_uuid: collectionBucket.bucket_uuid,
        collection_uuid: uuidV4(),
        imagesSession: imageSession.session_uuid,
        metadataSession: metadataSession.session_uuid,
        useApillonIpfsGateway: true,
        ipnsId: collectionIpns.id,
        currentStep: PrepareCollectionMetadataStep.UPLOAD_IMAGES_TO_IPFS,
      },
      stage.context,
    ).insert();

    //First step
    await worker.run({
      executeArg: JSON.stringify({
        collectionMetadataId: collectionMetadata.id,
      }),
    });

    let tmpCollectionMetadata = await new CollectionMetadata(
      {},
      stage.context,
    ).populateById(collectionMetadata.id);

    expect(tmpCollectionMetadata.currentStep).toBe(
      PrepareCollectionMetadataStep.UPDATE_JSONS_ON_S3,
    );

    //Second step
    await worker.run({
      executeArg: JSON.stringify({
        collectionMetadataId: collectionMetadata.id,
      }),
    });

    tmpCollectionMetadata = await new CollectionMetadata(
      {},
      stage.context,
    ).populateById(collectionMetadata.id);

    expect(tmpCollectionMetadata.currentStep).toBe(
      PrepareCollectionMetadataStep.UPLOAD_METADATA_TO_IPFS,
    );

    //Third step
    await worker.run({
      executeArg: JSON.stringify({
        collectionMetadataId: collectionMetadata.id,
      }),
    });

    tmpCollectionMetadata = await new CollectionMetadata(
      {},
      stage.context,
    ).populateById(collectionMetadata.id);

    expect(tmpCollectionMetadata.currentStep).toBe(
      PrepareCollectionMetadataStep.METADATA_SUCCESSFULLY_PREPARED,
    );

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

  test('Test add new nft metadata', async () => {
    //#region Prepare new image and metadata session

    //Create session
    imageSession = await new FileUploadSession(
      { session_uuid: uuidV4, bucket_id: collectionBucket.id },
      stage.context,
    ).insert();
    const image3Fur = new FileUploadRequest(
      {
        session_id: imageSession.id,
        bucket_id: collectionBucket.id,
        fileName: '3.png',
        contentType: 'image/png',
      },
      stage.context,
    );
    await createFURAndS3Url(
      stage.context,
      `NFT_METADATA_sessions/${collectionBucket.id}/${imageSession.session_uuid}/3.png`,
      image3Fur,
      imageSession,
      collectionBucket,
      s3Client,
    );

    //Upload images to s3
    let uploadRes = await request(image3Fur.url)
      .put('')
      .send(await fs.readFileSync('test/test-files/3.png'));

    expect(uploadRes.status).toBe(200);

    //Create session
    metadataSession = await new FileUploadSession(
      { session_uuid: uuidV4, bucket_id: collectionBucket.id },
      stage.context,
    ).insert();
    const metadata3Fur = new FileUploadRequest(
      {
        session_id: metadataSession.id,
        bucket_id: collectionBucket.id,
        fileName: '3.json',
        contentType: 'application/json',
      },
      stage.context,
    );
    await createFURAndS3Url(
      stage.context,
      `NFT_METADATA_sessions/${collectionBucket.id}/${metadataSession.session_uuid}/3.json`,
      metadata3Fur,
      metadataSession,
      collectionBucket,
      s3Client,
    );

    //Upload json to s3
    uploadRes = await request(metadata3Fur.url).put('').send({
      name: 'Nft 3',
      description: 'Nft 3 description',
      image: '3.png',
    });

    expect(uploadRes.status).toBe(200);

    //#endregion

    const collectionMetadata = await new CollectionMetadata(
      {
        bucket_uuid: collectionBucket.bucket_uuid,
        collection_uuid: uuidV4(),
        imagesSession: imageSession.session_uuid,
        metadataSession: metadataSession.session_uuid,
        useApillonIpfsGateway: true,
        currentStep: PrepareCollectionMetadataStep.UPLOAD_IMAGES_TO_IPFS,
      },
      stage.context,
    ).insert();

    //Execute 3 runs
    await worker.run({
      executeArg: JSON.stringify({
        collectionMetadataId: collectionMetadata.id,
      }),
    });

    await worker.run({
      executeArg: JSON.stringify({
        collectionMetadataId: collectionMetadata.id,
      }),
    });

    await worker.run({
      executeArg: JSON.stringify({
        collectionMetadataId: collectionMetadata.id,
      }),
    });

    //check files in bucket
    const filesInBucket = await new File(
      {},
      stage.context,
    ).populateFilesInBucket(collectionBucket.id, stage.context);

    expect(filesInBucket.length).toBe(6);

    const tmpImageFile = filesInBucket.find((x) => x.name == '3.png');
    expect(tmpImageFile).toBeTruthy();
    expect(tmpImageFile.CID).toBeTruthy();
    expect(tmpImageFile.CIDv1).toBeTruthy();

    const tmpMetadataFile = filesInBucket.find((x) => x.name == '3.json');
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
