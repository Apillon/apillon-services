import { CreateSubstrateTransactionDto, SubstrateChain } from '@apillon/lib';
import { DbTables, DidCreateOp, IdentityJobState } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Identity } from '../../modules/identity/models/identity.model';
import { IdentityJobService } from '../../modules/identity-job/identity-job.service';

import { SubmittableExtrinsic } from '@kiltprotocol/sdk-js';
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
  const identityJob = await IdentityJobService.createOrGetIdentityJob(
    context,
    identity.id,
    // Final state
    IdentityJobState.ATESTATION,
    {
      did_create_op: did_create_op,
      didUri: identity.didUri,
    },
  );

  // Current state
  await identityJob.setState(IdentityJobState.DID_CREATE);

  const bcServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transaction.toHex(),
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
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
  const identityJob = await IdentityJobService.createOrGetIdentityJob(
    context,
    identity.id,
    IdentityJobState.ATESTATION,
    {},
  );

  const bcServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transaction.toHex(),
        referenceTable: DbTables.IDENTITY_JOB,
        referenceId: identityJob.id,
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
  const identityJob = await IdentityJobService.createOrGetIdentityJob(
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
        referenceTable: DbTables.IDENTITY_JOB,
        referenceId: identityJob.id,
      },
      context,
    );

  return bcServiceRequest;
}
