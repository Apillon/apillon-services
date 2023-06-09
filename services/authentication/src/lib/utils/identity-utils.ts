import {
  BlockchainMicroservice,
  CreateSubstrateTransactionDto,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { DbTables, IdentityState, TransactionType } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { Identity } from '../../modules/identity/models/identity.model';
import { SubmittableExtrinsic } from '@kiltprotocol/sdk-js';

export async function sendIdentityCreateTx(
  context: ServiceContext,
  identity: Identity,
  transation: SubmittableExtrinsic,
) {
  await new Lmas().writeLog({
    logType: LogType.INFO,
    message: `Preparing DID create transaction ...`,
    location: 'Authentication-API/identity/authentication.worker',
    service: ServiceName.AUTHENTICATION_API,
  });

  const conn = await context.mysql.start();
  const dbTxRecord: Transaction = new Transaction({}, context);

  const blockchainServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transation,
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
      },
      context,
    );

  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(blockchainServiceRequest);

  dbTxRecord.populate({
    chainId: SubstrateChain.KILT,
    transactionType: TransactionType.DID_CREATE_TX,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionHash: response.data.transactionHash,
    transactionStatus: TransactionStatus.PENDING,
  });

  await TransactionService.saveTransaction(context, dbTxRecord, conn);

  // Update collection status
  identity.state = IdentityState.IN_PROGRESS;
  await identity.update(SerializeFor.UPDATE_DB, conn);

  // Commit the transaction to DB
  await conn.commit();
}
