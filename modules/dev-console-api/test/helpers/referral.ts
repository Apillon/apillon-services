import { Player } from '@apillon/referral/src/modules/referral/models/player.model';
import { TestContext, TestUser } from '@apillon/tests-lib';

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
