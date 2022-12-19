import { BucketWebhook } from '@apillon/storage/src/modules/bucket/models/bucket-webhook.model';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import { Project } from '../../src/modules/project/models/project.model';
import { TestContext } from './context';
import { TestUser } from './user';

export async function createTestBucket(
  user: TestUser,
  storageCtx: TestContext,
  project: Project,
): Promise<Bucket> {
  const bucket: Bucket = new Bucket({}, storageCtx).fake().populate({
    project_uuid: project.project_uuid,
    name: 'My bucket',
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
  name?: string,
  description?: string,
): Promise<Directory> {
  const directory: Directory = new Directory({}, storageCtx).fake().populate({
    project_uuid: project.project_uuid,
    parentDirectory_id: parentDirectoryId,
    bucket_id: bucket.id,
    name,
    description,
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
