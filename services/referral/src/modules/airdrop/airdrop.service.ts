import {
  SerializeFor,
  ReviewTasksDto,
  SqlModelStatus,
  PopulateFrom,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ReferralErrorCode } from '../../config/types';
import { ReferralCodeException } from '../../lib/exceptions';
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

  /**
   * Review NCTR token tasks from airdrop campaign and save data in DB
   * @param {{ body: ReviewTasksDto }} event
   * @param {ServiceContext} context
   * @returns {Promise<UserAirdropTask>}
   */
  static async reviewTasks(
    event: { body: ReviewTasksDto },
    context: ServiceContext,
  ): Promise<UserAirdropTask> {
    const reviewTasksDto = new ReviewTasksDto(event.body);

    // Check if user is eligible to claim
    const isBlocked = await AirdropService.checkClaimConditions(
      event.body,
      context,
    );

    // Get last populated user completed tasks and points
    const stats = await new UserAirdropTask({}, context).populateByUserUuid(
      context.user.user_uuid,
    );

    if (!stats.exists()) {
      throw new ReferralCodeException({
        status: 403,
        code: ReferralErrorCode.USER_NOT_ELIGIBLE,
      });
    }

    const conn = await context.mysql.start();
    try {
      // Update points after adding galxe points for user
      await stats.addGalxePoints(event.body.wallet, conn);

      // Create new token claim entry
      await new TokenClaim(reviewTasksDto, context)
        .populate({
          totalNctr: stats.totalPoints,
          user_uuid: context.user.user_uuid,
          status: isBlocked ? SqlModelStatus.ACTIVE : SqlModelStatus.BLOCKED,
        })
        .insert(SerializeFor.INSERT_DB, conn);
      await context.mysql.commit(conn);

      return stats.serialize(SerializeFor.SERVICE) as UserAirdropTask;
    } catch (err) {
      await context.mysql.rollback(conn);
      if (err instanceof ReferralCodeException) {
        throw err;
      } else {
        throw await new ReferralCodeException({
          code: ReferralErrorCode.ERROR_REVIEWING_TASKS,
          status: 500,
          context,
          errorMessage: err?.message,
          sourceFunction: 'reviewTasks()',
          sourceModule: 'AirdropService',
        }).writeToMonitor({
          user_uuid: context?.user?.user_uuid,
          data: reviewTasksDto.serialize(),
          sendAdminAlert: true,
        });
      }
    }
  }

  /**
   * Check if user is eligible to claim tokens
   * No fraudulent or duplicate accounts
   * @param {ReviewTasksDto} reviewTasksDto - The DTO containing review data
   * @param {ServiceContext} context
   * @throws {ReferralCodeException} - If user already claimed or is blocked
   * @returns {Promise<boolean>} - If user is eligible to claim
   */
  static async checkClaimConditions(
    reviewTasksDto: ReviewTasksDto,
    context: ServiceContext,
  ): Promise<boolean> {
    // Check if user already claimed
    const claimUser = await new TokenClaim({}, context).populateByUUID(
      context.user.user_uuid,
      'user_uuid',
    );

    if (claimUser.exists()) {
      throw new ReferralCodeException({
        status: 400,
        code: ReferralErrorCode.REVIEW_ALREADY_SUBMITTED,
      });
    }

    const claimers = await new TokenClaim(
      reviewTasksDto,
      context,
    ).findAllByIpOrFingerprint();

    if (claimers.length) {
      // Insert new claimer and set all to blocked, because IP or fingerprint matches with another user
      await Promise.all(claimers.map((c) => c.markBlocked()));
      return false;
    }

    return true;
  }
}
