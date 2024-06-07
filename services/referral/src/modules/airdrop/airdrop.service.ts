import {
  SerializeFor,
  ReviewTasksDto,
  SqlModelStatus,
  env,
  getSecrets,
  runWithWorkers,
  Lmas,
  LogType,
  ServiceName,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ReferralErrorCode } from '../../config/types';
import { ReferralCodeException } from '../../lib/exceptions';
import { UserAirdropTask } from './models/user-airdrop-task.model';
import { TokenClaim } from './models/token-claim';
import { ethers } from 'ethers';

export class AirdropService {
  /**
   * Get completed airdrop tasks and total points for a user
   * @returns {Promise<{ tokenClaim: TokenClaim; airdropStats: UserAirdropTask }>}
   */
  static async getAirdropTasks(
    _event: void,
    context: ServiceContext,
  ): Promise<{ tokenClaim: TokenClaim; airdropStats: UserAirdropTask }> {
    const user_uuid = context.user.user_uuid;

    const [stats, tokenClaim] = await Promise.all([
      new UserAirdropTask({}, context).populateByUserUuid(user_uuid),
      new TokenClaim({}, context).populateByUUID(user_uuid, 'user_uuid'),
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
    const user_uuid = context.user.user_uuid;

    // Check if user is eligible to claim
    const isBlocked = await AirdropService.checkClaimConditions(
      event.body,
      context,
    );

    // Get last populated user completed tasks and points
    const stats = await new UserAirdropTask({}, context).populateByUserUuid(
      user_uuid,
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
          user_uuid,
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
          user_uuid,
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
    ).findAllByFingerprint();

    if (claimers.length) {
      // Insert new claimer and set all to blocked, because IP or fingerprint matches with another user
      await Promise.all(claimers.map((c) => c.markBlocked()));
      return false;
    }

    return true;
  }

  /**
   * Get claim parameters for a user for smart contract claim call
   * @param {ServiceContext} context
   */
  static async getClaimParameters(
    _event: void,
    context: ServiceContext,
  ): Promise<{ amount: string; timestamp: number; signature: string }> {
    const user_uuid = context.user.user_uuid;

    const tokenClaim = await new TokenClaim({}, context).populateByUUID(
      user_uuid,
      'user_uuid',
    );

    if (!tokenClaim.exists() || tokenClaim.status === SqlModelStatus.BLOCKED) {
      throw new ReferralCodeException({
        status: 403,
        code: ReferralErrorCode.CLAIM_FORBIDDEN,
      });
    }

    if (tokenClaim.claimCompleted) {
      throw new ReferralCodeException({
        status: 400,
        code: ReferralErrorCode.CLAIM_ALREADY_COMPLETED,
      });
    }

    // Convert to ether format with 18 decimals
    const amount = ethers.utils
      .parseEther(`${tokenClaim.totalNctr}`)
      .toString();

    const [airdropTimestamp, contractAddress, chainId, signerKey] = [
      env.AIRDROP_CLAIM_TIMESTAMP,
      env.AIRDROP_CLAIM_CONTRACT_ADDRESS,
      env.AIRDROP_CLAIM_CHAIN_ID,
      (await getSecrets(env.BLOCKCHAIN_SECRETS))['AIRDROP_CLAIM'],
    ];

    // The message consists of all these parameters packed hashed together
    const message = ethers.utils.solidityKeccak256(
      ['address', 'address', 'uint256', 'uint256', 'uint256'],
      [contractAddress, tokenClaim.wallet, amount, airdropTimestamp, chainId],
    );

    // Sign the message with the private key of the signer wallet
    // Which is verified on the smart contract
    const signature = await new ethers.Wallet(signerKey).signMessage(
      ethers.utils.arrayify(message),
    );

    return { amount, timestamp: +airdropTimestamp, signature };
  }

  /**
   * Set token claims as completed and fill out transactionHash for each claim
   * @param event - array of all wallets which claimed and the corresponding tx hash of the claim
   * @param {ServiceContext} context
   */
  static async setClaimsCompleted(
    event: {
      data: {
        wallet: string;
        transactionHash: string;
      }[];
    },
    context: ServiceContext,
  ) {
    await runWithWorkers(
      event.data,
      20,
      context,
      async ({ wallet, transactionHash }, context: ServiceContext) => {
        await new TokenClaim({ wallet }, context)
          .setCompleted(transactionHash)
          .catch((e) =>
            new Lmas().writeLog({
              logType: LogType.ERROR,
              message: `Error marking token claim as complete`,
              location: 'AirdropService.setClaimsCompleted',
              service: ServiceName.REFERRAL,
              data: { error: e, events: event.data },
              sendAdminAlert: true,
            }),
          );
      },
    );

    return true;
  }
}
