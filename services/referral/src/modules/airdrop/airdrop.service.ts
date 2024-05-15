import { SerializeFor, ReviewTasksDto, SqlModelStatus } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ReferralErrorCode } from '../../config/types';
import { ReferralCodeException } from '../../lib/exceptions';
import { UserAirdropTask } from './models/user-airdrop-task.model';
import { TokenClaim } from './token-claim';
import * as fs from 'fs';

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
   */
  static async reviewTasks(
    event: { body: ReviewTasksDto },
    context: ServiceContext,
  ) {
    const claimTokenDto = new ReviewTasksDto(event.body);
    // Check if user is elligible to claim
    await AirdropService.checkClaimConditions(event.body, context);

    // Get last populated user completed tasks and points
    const userAirdropStats = await new UserAirdropTask(
      {},
      context,
    ).populateByUserUuid(context.user.user_uuid);

    if (!userAirdropStats.exists()) {
      throw new ReferralCodeException({
        status: 403,
        code: ReferralErrorCode.USER_NOT_ELIGIBLE,
      });
    }

    const conn = await context.mysql.start();
    try {
      const galxeTasksCompleted = await AirdropService.getGalxeTasksCompleted(
        claimTokenDto.wallet,
      );

      // Update points after adding galxe points for user
      await userAirdropStats.addGalxePoints(galxeTasksCompleted, conn);

      // Create new token claim entry
      await new TokenClaim(claimTokenDto, context)
        .populate({
          totalClaimed: userAirdropStats.totalPoints,
          user_uuid: context.user.user_uuid,
        })
        .insert(SerializeFor.INSERT_DB, conn);

      await context.mysql.commit(conn);

      return userAirdropStats;
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
          sourceModule: 'AirdropService',
        }).writeToMonitor({
          user_uuid: context?.user?.user_uuid,
          data: claimTokenDto.serialize(),
          sendAdminAlert: true,
        });
      }
    }
  }

  /**
   * Check if user is elligible to claim tokens
   * No fraudulent or duplicate accounts
   * No claiming with account created after snapshot
   * @param {ReviewTasksDto} claimTokensDto - The DTO containing claim data
   * @param {ServiceContext} context
   */
  static async checkClaimConditions(
    claimTokensDto: ReviewTasksDto,
    context: ServiceContext,
  ) {
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
          : ReferralErrorCode.USER_ALREADY_CLAIMED,
      });
    }

    const claimers = await new TokenClaim(
      claimTokensDto,
      context,
    ).findAllByIpAndFingerprint();

    if (!claimers.length) {
      return;
    }

    // Insert new claimer and set all to blocked, because IP and fingerprint matches with another user
    await Promise.allSettled([
      new TokenClaim(claimTokensDto, context)
        .populate({
          user_uuid, // user_uuid is table PK
          status: SqlModelStatus.BLOCKED,
        })
        .insert(SerializeFor.INSERT_DB),
      ...claimers.map((c) => c.markBlocked()),
    ]);

    throw new ReferralCodeException({
      status: 403,
      code: ReferralErrorCode.CLAIM_FORBIDDEN,
    });
  }

  /**
   * Get number of tasks completed on Galxe for wallet
   * @param {string} wallet
   * @param {ServiceContext} context
   * @returns {Promise<number>}
   */
  static async getGalxeTasksCompleted(wallet: string): Promise<number> {
    const wallets = fs
      .readFileSync(`${__dirname}/data/galxe-tokens.csv`, 'utf8')
      .split('\n');

    // Get number of occurences for wallet in CSV file
    return wallets.reduce(
      (count, rowWallet) =>
        count +
        (rowWallet.toLowerCase().includes(wallet.toLowerCase()) ? 1 : 0),
      0,
    );
  }
}
