import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
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
