import {
  BlockchainMicroservice,
  CreateSubstrateTransactionDto,
} from '@apillon/lib';

export async function sendBlockchainServiceRequest(
  context: any,
  bcServiceRequest: CreateSubstrateTransactionDto,
) {
  return await new BlockchainMicroservice(context).createSubstrateTransaction(
    bcServiceRequest,
  );
}
