import { SerializeFor, ReviewTasksDto, SqlModelStatus } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ReferralErrorCode } from '../../config/types';
import { ReferralCodeException } from '../../lib/exceptions';
import { UserAirdropTask } from './models/user-airdrop-task.model';
import { TokenClaim } from './models/token-claim';

export class AirdropService {
  /**
   * Get completed airdrop tasks and total points for a user
   * @param {user_uuid} - UUID of the user requesting the airdrop tasks
   * @returns {Promise<UserAirdropTask>} - UserAirdropTask model from Referral MS
   */
  static async getAirdropTasks(
    event: { user_uuid: string },
    context: ServiceContext,
  ): Promise<UserAirdropTask> {
    const stats = await new UserAirdropTask({}, context).populateByUserUuid(
      event.user_uuid,
    );
    return stats.serialize(SerializeFor.SERVICE) as UserAirdropTask;
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
    // Check if user is elligible to claim
    await AirdropService.checkClaimConditions(event.body, context);

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
          totalClaimed: stats.totalPoints,
          user_uuid: context.user.user_uuid,
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
   * Check if user is elligible to claim tokens
   * No fraudulent or duplicate accounts
   * @param {ReviewTasksDto} reviewTasksDto - The DTO containing review data
   * @param {ServiceContext} context
   * @throws {ReferralCodeException} - If user already claimed or is blocked
   */
  static async checkClaimConditions(
    reviewTasksDto: ReviewTasksDto,
    context: ServiceContext,
  ): Promise<void> {
    const user_uuid = context.user.user_uuid;

    // Check if user already claimed
    const claimUser = await new TokenClaim({}, context).populateByUUID(
      user_uuid,
      'user_uuid',
    );

    if (claimUser.exists()) {
      throw new ReferralCodeException({
        status: claimUser.blocked ? 403 : 400,
        code: claimUser.blocked
          ? ReferralErrorCode.CLAIM_FORBIDDEN
          : ReferralErrorCode.TASKS_ALREADY_REVIEWED,
      });
    }

    const claimers = await new TokenClaim(
      reviewTasksDto,
      context,
    ).findAllByIpOrFingerprint();

    if (!claimers.length) {
      return;
    }

    // Insert new claimer and set all to blocked, because IP or fingerprint matches with another user
    await Promise.all(claimers.map((c) => c.markBlocked()));

    await new TokenClaim(reviewTasksDto, context)
      .populate({
        user_uuid, // user_uuid is table PK
        status: SqlModelStatus.BLOCKED,
      })
      .insert(SerializeFor.INSERT_DB);

    throw new ReferralCodeException({
      status: 403,
      code: ReferralErrorCode.CLAIM_FORBIDDEN,
    });
  }
}
