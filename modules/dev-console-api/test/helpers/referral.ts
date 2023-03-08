import { BucketWebhook } from '@apillon/storage/src/modules/bucket/models/bucket-webhook.model';
import { Player } from '@apillon/referral/src/modules/referral/models/player.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import { Project } from '../../src/modules/project/models/project.model';
import { TestContext } from './context';
import { TestUser } from './user';

export async function createTestReferralPlayer(
  user: TestUser,
  ctx: TestContext,
): Promise<Player> {
  const player: Player = new Player({}, ctx).fake().populate({
    user_uuid: user.user.user_uuid,
  });

  await player.insert();

  return player;
}
