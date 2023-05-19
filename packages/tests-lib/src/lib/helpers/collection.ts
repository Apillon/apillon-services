import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { TestContext } from './context';
import { TestUser } from './user';
import { SqlModelStatus } from '@apillon/lib';
import { Collection } from '@apillon/nfts/src/modules/nfts/models/collection.model';
import { v4 as uuidV4 } from 'uuid';

export async function createTestNFTCollection(
  user: TestUser,
  nftCtx: TestContext,
  project: Project,
  status = SqlModelStatus.ACTIVE,
  collectionStatus: number,
): Promise<Collection> {
  const collection: Collection = new Collection({}, nftCtx).fake().populate({
    collection_uuid: uuidV4(),
    project_uuid: project.project_uuid,
    status,
    collectionStatus,
  });

  await collection.insert();

  return collection;
}
