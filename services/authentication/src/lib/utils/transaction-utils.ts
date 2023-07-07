import {
  CreateSubstrateTransactionDto,
  SubstrateChain,
  TransactionStatus,
  writeLog,
} from '@apillon/lib';
import {
  DbTables,
  DidCreateOp,
  IdentityJobState,
  TransactionType,
} from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Identity } from '../../modules/identity/models/identity.model';
import { SubmittableExtrinsic } from '@kiltprotocol/sdk-js';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { IdentityJobService } from '../../modules/identity-job/identity-job.service';

/**
 * Creates identity create request for the blockchain service
 *
 * @param context
 * @param SubmittableExtrinsic with did creation details
 * @param identity Identity
 * @param did_create_op DidCreateOp
 */
export async function identityCreateRequestBc(
  context: ServiceContext,
  transaction: SubmittableExtrinsic,
  identity: Identity,
  did_create_op: DidCreateOp,
) {
  const dbTxRecord: Transaction = new Transaction({}, context);
  dbTxRecord.populate({
    transactionHash: transaction.hash,
    transactionType: TransactionType.DID_CREATE,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });
  await TransactionService.saveTransaction(dbTxRecord);

  const identityJob = await IdentityJobService.initOrGetIdentityJob(
    context,
    identity.id,
    IdentityJobState.ATESTATION,
  );

  await identityJob.setState(IdentityJobState.ATESTATION);

  const bcServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transaction.toHex(),
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
        data: {
          email: identity.email,
          did_create_op: did_create_op,
          transactionType: TransactionType.DID_CREATE,
        },
      },
      context,
    );

  return bcServiceRequest;
}

/**
 * Creates attestation request for the blockchain service
 *
 * @param context
 * @param SubmittableExtrinsic with did creation details
 * @param identity Identity
 */
export async function attestationRequestBc(
  context: ServiceContext,
  transaction: SubmittableExtrinsic,
  identity: Identity,
) {
  const dbTxRecord: Transaction = await new Transaction(
    {},
    context,
  ).populateByRefId(identity.id);

  dbTxRecord.populate({
    transactionHash: transaction.hash,
    transactionType: TransactionType.ATTESTATION,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });

  if (dbTxRecord.exists()) {
    await TransactionService.saveTransaction(dbTxRecord);
  } else {
    await dbTxRecord.update();
  }

  await IdentityJobService.initOrGetIdentityJob(context, identity.id);

  const bcServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transaction.toHex(),
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
        data: {
          transactionType: TransactionType.ATTESTATION,
        },
      },
      context,
    );

  return bcServiceRequest;
}

/**
 * Creates did revoke request for the blockchain service
 *
 * @param context
 * @param SubmittableExtrinsic with did creation details
 * @param identity Identity
 */
export async function didRevokeRequestBc(
  context: ServiceContext,
  transaction: SubmittableExtrinsic,
  identity: Identity,
) {
  const dbTxRecord: Transaction = new Transaction({}, context);

  const identityJob = await IdentityJobService.initOrGetIdentityJob(
    context,
    identity.id,
    IdentityJobState.DID_REVOKE,
  );

  await identityJob.setState(IdentityJobState.DID_REVOKE);

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

  await TransactionService.saveTransaction(dbTxRecord);

  return bcServiceRequest;
}
