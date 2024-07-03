import {
  SerializeFor,
  SqlModelStatus,
  env,
  getSecrets,
  runWithWorkers,
  Lmas,
  LogType,
  ServiceName,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
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
