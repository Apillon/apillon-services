import {
  SerializeFor,
  ClaimTokensDto,
  PoolConnection,
  SqlModelStatus,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ReferralErrorCode } from '../../config/types';
import { ReferralCodeException } from '../../lib/exceptions';
import { UserAirdropTask } from './models/user-airdrop-task.model';
import { TokenClaim } from './token-claim';

export class AirdropService {
  /**
   * Get completed airdrop tasks and total points for a user
   * @param {user_uuid} - UUID of the user requesting the airdrop tasks
   * @returns {UserAirdropTask} - UserAirdropTask model from Referral MS
   */
  static async getAirdropTasks(
    event: { user_uuid: string },
    context: ServiceContext,
  ) {
    const stats = await new UserAirdropTask({}, context).populateByUserUuid(
      event.user_uuid,
    );
    return stats.serialize(SerializeFor.SERVICE);
  }

  /**
   * Claim NCTR tokens from airdrop campaign
   * @param {{ body: ClaimTokensDto }} event
   * @param {ServiceContext} context
   */
  static async claimTokens(
    event: { body: ClaimTokensDto },
    context: ServiceContext,
  ) {
    const conn = await context.mysql.start();
    try {
      // Check if user is elligible to claim
      await AirdropService.checkClaimConditions(event, context, conn);
      // Get last populated user completed tasks and points
      const stats = await new UserAirdropTask({}, context).populateByUserUuid(
        context.user.user_uuid,
      );
      const totalNctr = stats.totalPoints;
      // TODO: add points from GLXE
      // TODO: send NCTR to wallet logic

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      if (err instanceof ReferralCodeException) {
        throw err;
      } else {
        throw await new ReferralCodeException({
          code: ReferralErrorCode.ERROR_CLAIMING_TOKENS,
          status: 500,
          context,
          errorMessage: err?.message,
          sourceFunction: 'claimTokens()',
          sourceModule: 'ReferralService',
        }).writeToMonitor({
          user_uuid: context?.user?.user_uuid,
          data: event.body.serialize(),
          sendAdminAlert: true,
        });
      }
    }
  }

  /**
   * Check if user is elligible to claim tokens
   * No duplicate accounts
   * No claiming with account created after snapshot
   * No fraudulent or duplicate accounts
   * @param {{ body: ClaimTokensDto }} event
   * @param {ServiceContext} context
   * @param {PoolConnection} conn
   */
  static async checkClaimConditions(
    event: { body: ClaimTokensDto },
    context: ServiceContext,
    conn: PoolConnection,
  ) {
    const user_uuid = context.user.user_uuid;

    // Check if user already claimed
    const claimUser = await new TokenClaim({}, context).populateByUUID(
      user_uuid,
      'user_uuid',
      conn,
    );
    if (claimUser.exists()) {
      throw new ReferralCodeException({
        status: claimUser.blocked ? 403 : 400,
        code: claimUser.blocked
          ? ReferralErrorCode.CLAIM_FORBIDDEN
          : ReferralErrorCode.USER_ALREADY_CLAIMED,
      });
      // TODO: change timestamp at airdrop cutoff date
    } else if (claimUser.createTime.getTime() > 1713529821058) {
      throw new ReferralCodeException({
        status: 403,
        code: ReferralErrorCode.USER_NOT_ELIGIBLE,
      });
    }

    const claimer = await new TokenClaim(
      event.body,
      context,
    ).populateByIpAndFingerprint(conn);

    if (claimer.exists()) {
      // Insert new claimer and set to blocked, because IP and fingerprint matches with another user
      await claimer
        .populate({
          user_uuid, // user_uuid is table PK
          wallet: event.body.wallet,
          status: SqlModelStatus.BLOCKED,
        })
        .insert(SerializeFor.INSERT_DB, conn);

      throw new ReferralCodeException({
        status: 403,
        code: ReferralErrorCode.USER_NOT_ELIGIBLE,
      });
    }
  }
}
