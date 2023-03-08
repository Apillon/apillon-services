import { BucketType } from '@apillon/storage/src/config/types';
import { BucketWebhook } from '@apillon/storage/src/modules/bucket/models/bucket-webhook.model';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { TestContext } from './context';
import { TestUser } from './user';
import { IPFSService } from '@apillon/storage/src/modules/ipfs/ipfs.service';
import { v4 as uuidV4 } from 'uuid';
import { SqlModelStatus } from '@apillon/lib';

export async function createTestBucket(
  user: TestUser,
  storageCtx: TestContext,
  project: Project,
  bucketType?: BucketType,
  status = SqlModelStatus.ACTIVE,
): Promise<Bucket> {
  const bucket: Bucket = new Bucket({}, storageCtx).fake().populate({
    project_uuid: project.project_uuid,
    name: 'My bucket',
    bucketType: bucketType || BucketType.STORAGE,
    status,
  });

  await bucket.insert();

  return bucket;
}

export async function createTestBucketWebhook(
  storageCtx: TestContext,
  bucket: Bucket,
) {
  const webhook: BucketWebhook = new BucketWebhook({}, storageCtx).populate({
    bucket_id: bucket.id,
    url: 'https://eob0hpm13hsj7sk.m.pipedream.net',
  });

  await webhook.insert();
  return webhook;
}

export async function createTestBucketDirectory(
  storageCtx: TestContext,
  project: Project,
  bucket: Bucket,
  addFiles: boolean,
  parentDirectoryId?: number,
  name = 'test directory',
  description?: string,
  status = SqlModelStatus.ACTIVE,
): Promise<Directory> {
  const directory: Directory = new Directory({}, storageCtx).fake().populate({
    project_uuid: project.project_uuid,
    parentDirectory_id: parentDirectoryId,
    bucket_id: bucket.id,
    name,
    description,
    status,
  });

  await directory.insert();

  if (addFiles) {
    const file: File = await new File({}, storageCtx).fake().populate({
      name: 'myFile1.txt',
      contentType: 'text/plain',
      project_uuid: project.project_uuid,
      bucket_id: bucket.id,
      directory_id: directory.id,
      size: 500,
    });
    await file.insert();

    const file2: File = await new File({}, storageCtx).fake().populate({
      name: 'myFile2.txt',
      contentType: 'text/plain',
      project_uuid: project.project_uuid,
      bucket_id: bucket.id,
      directory_id: directory.id,
      size: 500,
    });

    await file2.insert();
  }

  return directory;
}

export async function createTestBucketFile(
  storageCtx: TestContext,
  bucket: Bucket,
  fileName = 'myTestFile.txt',
  contentType = 'text/plain',
  addToIPFS = false,
  directory_id?: number,
  status = SqlModelStatus.ACTIVE,
) {
  let cid = undefined;
  if (addToIPFS) {
    //Add fake file to IPFS
    const deleteBucketTestFIle1CID = await IPFSService.addFileToIPFS({
      path: fileName,
      content: new Date().toString() + uuidV4(),
    });
    cid = deleteBucketTestFIle1CID.cidV0;
  }

  const f: File = await new File({}, storageCtx).fake().populate({
    name: fileName,
    contentType: contentType,
    project_uuid: bucket.project_uuid,
    bucket_id: bucket.id,
    size: 500,
    CID: cid,
    directory_id: directory_id,
    status,
  });

  await f.insert();

  //Increase bucket size
  if (!bucket.size) {
    bucket.size = 500;
  } else {
    bucket.size += 500;
  }

  await bucket.update();

  return f;
}
