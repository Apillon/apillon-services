import { ChainType, SubstrateChain } from '@apillon/lib';
import { BlockchainErrorCode } from '../../../config/types';
import { BlockchainCodeException } from '../../../lib/exceptions';
import { Wallet } from '../../wallet/wallet.model';
import { CrustBlockchainIndexer } from './crust/indexer.service';
import { KiltBlockchainIndexer } from './kilt/indexer.service';

/**
 * Checks indexer to determine if transaction exists (is indexed).
 * @param wallet Wallet
 * @param transactionHash
 */
export async function isTransactionIndexed(
  wallet: Wallet,
  transactionHash: string,
) {
  if (wallet.chainType !== ChainType.SUBSTRATE) {
    throw new BlockchainCodeException({
      code: BlockchainErrorCode.INVALID_CHAIN,
      status: 400,
      errorMessage: 'Only substrate chain types supported',
    });
  }
  let transactions = {};
  switch (wallet.chain) {
    case SubstrateChain.KILT:
      transactions =
        await new KiltBlockchainIndexer().getAccountTransactionsByHash(
          wallet.address,
          transactionHash,
        );
      break;
    case SubstrateChain.CRUST:
      transactions =
        await new CrustBlockchainIndexer().getAccountTransactionsByHash(
          wallet.address,
          transactionHash,
        );
      break;
    default:
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_CHAIN,
        status: 400,
        errorMessage: `Chain ${wallet.chain} is not supported.`,
      });
  }
  return Object.values(transactions).reduce(
    (transactionExists, transaction) =>
      transactionExists || (Array.isArray(transaction) && transaction.length),
    false,
  );
}
