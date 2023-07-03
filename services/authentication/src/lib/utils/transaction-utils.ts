import {
  ChainType,
  CreateSubstrateTransactionDto,
  Lmas,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { DbTables, TransactionType } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Identity } from '../../modules/identity/models/identity.model';
import { SubmittableExtrinsic } from '@kiltprotocol/sdk-js';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';

/* NOTE: Creates a DID create transaction */
export async function createDIDCreateBlockchainRequest(
  context: ServiceContext,
  transaction: SubmittableExtrinsic,
  identity: Identity,
  conn?: PoolConnection,
) {
  await new Lmas().writeLog({
    logType: LogType.INFO,
    message: `Creating DID create request ...`,
    location: 'Authentication-API/identity/authentication.worker',
    service: ServiceName.AUTHENTICATION_API,
  });

  console.log('Saving transaction ....');
  const dbTxRecord: Transaction = new Transaction({}, context);
  dbTxRecord.populate({
    transactionHash: transaction.hash,
    transactionType: TransactionType.DID_CREATE,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });
  await TransactionService.saveTransaction(context, dbTxRecord, conn);

  console.log('Saved ....');
  const data = {
    transactionType: TransactionType.DID_CREATE,
  };

  console.log('VCreating DTO for bc ....');
  const bcServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transaction.toHex(),
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
        data: data,
      },
      context,
    );

  return bcServiceRequest;
}

/* NOTE: Creates an attestation transaction */
export async function createAttesBlockchainRequest(
  context: ServiceContext,
  transaction: SubmittableExtrinsic,
  identity: Identity,
  conn?: PoolConnection,
) {
  await new Lmas().writeLog({
    logType: LogType.INFO,
    message: `Creating attestation request ...`,
    location: 'Authentication-API/identity/authentication.worker',
    service: ServiceName.AUTHENTICATION_API,
  });
  const dbTxRecord: Transaction = new Transaction({}, context);

  const bcServiceRequest: CreateSubstrateTransactionDto =
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
    transactionType: TransactionType.ATTESTATION,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });

  await TransactionService.saveTransaction(context, dbTxRecord, conn);

  return bcServiceRequest;
}

/* NOTE: Creates a DID revoke request */
export async function createDIDRevokeBlockhainRequest(
  context: ServiceContext,
  transaction: SubmittableExtrinsic,
  identity: Identity,
  conn?: PoolConnection,
) {
  await new Lmas().writeLog({
    logType: LogType.INFO,
    message: `Creating DID revoke request ...`,
    location: 'Authentication-API/identity/authentication.worker',
    service: ServiceName.AUTHENTICATION_API,
  });
  const dbTxRecord: Transaction = new Transaction({}, context);

  const bcServiceRequest: CreateSubstrateTransactionDto =
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
    transactionType: TransactionType.DID_REVOKE,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });

  await TransactionService.saveTransaction(context, dbTxRecord, conn);

  return bcServiceRequest;
}
