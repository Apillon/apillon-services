import { SerializeFor } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { UserAirdropTask } from './models/user-airdrop-task.model';
import { TokenClaim } from './models/token-claim';

export class AirdropService {
  /**
   * Get completed airdrop tasks and total points for a user
   * @param {user_uuid} - UUID of the user requesting the airdrop tasks
   * @returns {Promise<{ tokenClaim: TokenClaim; airdropStats: UserAirdropTask }>}
   */
  static async getAirdropTasks(
    event: { user_uuid: string },
    context: ServiceContext,
  ): Promise<{ tokenClaim: TokenClaim; airdropStats: UserAirdropTask }> {
    const [stats, tokenClaim] = await Promise.all([
      new UserAirdropTask({}, context).populateByUserUuid(event.user_uuid),
      new TokenClaim({}, context).populateByUUID(event.user_uuid, 'user_uuid'),
    ]);

    return {
      tokenClaim: tokenClaim.serialize(SerializeFor.PROFILE) as TokenClaim,
      airdropStats: stats.serialize(SerializeFor.PROFILE) as UserAirdropTask,
    };
  }
}
