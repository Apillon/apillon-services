import { ChainType, SubstrateChain, TransactionStatus } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Transaction } from '../../../common/models/transaction';

export async function insertControlTransaction(
  address: string,
  chain: SubstrateChain,
  chainType: ChainType,
  context: ServiceContext,
  transactionHash: string,
  status?: string,
) {
  return await new Transaction(
    {
      address,
      chain,
      chainType,
      transactionStatus: status ? status : TransactionStatus.PENDING,
      nonce: 1,
      rawTransaction: 'blablablablablablablablablablablalba',
      transactionHash: transactionHash,
    },
    context,
  ).insert();
}
