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
  transaction: SubmittableExtrinsic,
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
        transaction: transaction,
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
      },
      context,
    );

  dbTxRecord.populate({
    chainId: SubstrateChain.KILT,
    transactionType: TransactionType.DID_CREATE,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });

  await TransactionService.saveTransaction(context, dbTxRecord, conn);

  // Update collection status
  identity.state = IdentityState.IN_PROGRESS;
  await identity.update(SerializeFor.UPDATE_DB, conn);

  await conn.commit();

  await new BlockchainMicroservice(context).createSubstrateTransaction(
    blockchainServiceRequest,
  );
}
