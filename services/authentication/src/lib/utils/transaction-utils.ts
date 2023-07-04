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
export async function identityCreateRequest(
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

  const dbTxRecord: Transaction = new Transaction({}, context);
  dbTxRecord.populate({
    transactionHash: transaction.hash,
    transactionType: TransactionType.DID_CREATE,
    refTable: DbTables.IDENTITY,
    refId: identity.id,
    transactionStatus: TransactionStatus.PENDING,
  });
  await TransactionService.saveTransaction(context, dbTxRecord, conn);

  const bcServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transaction.toHex(),
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
        data: {
          transactionType: TransactionType.DID_CREATE,
        },
      },
      context,
    );

  return bcServiceRequest;
}

export async function attestationCreateRequest(
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
    await TransactionService.saveTransaction(context, dbTxRecord, conn);
  } else {
    await dbTxRecord.update();
  }

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

// Prepare identity instance and credential structure
// const { attestationRequest, credential } = createAttestationRequest(
//   claimerEmail,
//   attesterDidUri,
//   claimerDidUri as DidUri,
// );

// // NOTE!!: Did.getKeyRelationshipForTx(attestation) --> assertionMethod
// const attestation = api.tx.attestation.add(
//   attestationRequest.claimHash,
//   attestationRequest.cTypeHash,
//   null,
// );

// const nextNonce = new BN(await getNextNonce(attesterDidUri));

// await new Lmas().writeLog({
//   logType: LogType.INFO,
//   message: 'Creating ATTESTATION TX ...',
//   location: 'AUTHENTICATION-API/identity/authentication.worker',
//   service: ServiceName.AUTHENTICATION_API,
//   data: { email: claimerEmail, didUri: claimerDidUri },
// });

// const emailAttesatationTx = await Did.authorizeTx(
//   attesterDidUri,
//   attestation,
//   async ({ data }) => ({
//     signature: attesterKeypairs.assertionMethod.sign(data),
//     keyType: attesterKeypairs.assertionMethod.type,
//   }),
//   attesterAcc.address,
//   { txCounter: nextNonce },
// );

// const authorizedBatchedTxs = await Did.authorizeBatch({
//   batchFunction: api.tx.utility.batchAll,
//   did: attesterDidUri,
//   extrinsics: [fullDidCreationTx, emailAttesatationTx],
//   sign: authenticationSigner(attesterKeypairs),
//   submitter: attesterAcc.address,
// });

// const bcsRequest = await identityCreateRequest(
//   context,
//   authorizedBatchedTxs,
//   identity,
// );

// const claimerCredential = {
//   credential: {
//     ...credential,
//   },
//   claimerSignature: {
//     keyType: KiltSignAlgorithm.SR25519,
//     keyUri: claimerDidUri,
//   },
//   name: 'Email',
//   status: 'pending',
//   attester: Attester.APILLON,
//   cTypeTitle: getCtypeSchema(ApillonSupportedCTypes.EMAIL).title,
// };

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
