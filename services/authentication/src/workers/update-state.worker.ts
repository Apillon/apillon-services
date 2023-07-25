import {
  AppEnvironment,
  AttestationDto,
  IdentityCreateDto,
  IdentityDidRevokeDto,
  Lmas,
  LogType,
  ServiceName,
  TransactionStatus,
  env,
  runWithWorkers,
  writeLog,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { IdentityJobState, IdentityState } from '../config/types';
import { Identity } from '../modules/identity/models/identity.model';
import { IdentityMicroservice } from '../modules/identity/identity.service';
import { IdentityJob } from '../modules/identity-job/models/identity-job.model';

export class UpdateStateWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.AUTH_AWS_WORKER_SQS_URL);
    this.context = context;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  // TODO: REMOVE and just use LMAS
  private async logAms(
    contex?: any,
    message?: any,
    error?: boolean,
    data?: any,
  ) {
    await new Lmas().writeLog({
      context: contex,
      logType: error ? LogType.ERROR : LogType.INFO,
      message: message,
      location: `UpdateStateWorker`,
      service: ServiceName.AUTHENTICATION_API,
      data: {
        ...data,
      },
    });
  }

  private async execAttestClaim(identity: Identity) {
    const attestationClaimDto = new AttestationDto().populate({
      email: identity.email,
      didUri: identity.didUri,
      token: identity.token,
    });
    if (env.APP_ENV != AppEnvironment.TEST) {
      console.log('Attestation DTO: ', attestationClaimDto);

      await IdentityMicroservice.attestClaim(
        { body: attestationClaimDto },
        this.context,
      );
    }
  }

  private async execIdentityGenerate(email: string, did_create_op: any) {
    const identityCreateDto = new IdentityCreateDto().populate({
      email: email,
      did_create_op: did_create_op,
    });

    if (env.APP_ENV != AppEnvironment.TEST) {
      await IdentityMicroservice.generateIdentity(
        { body: identityCreateDto },
        this.context,
      );
    }
  }

  private async execIdentityRevoke(incomignTxData: any) {
    const identityRevokeDto = new IdentityDidRevokeDto().populate({
      email: incomignTxData.email,
      token: incomignTxData.token,
    });
    await IdentityMicroservice.revokeIdentity(
      { body: identityRevokeDto },
      this.context,
    );

    if (env.APP_ENV != AppEnvironment.TEST) {
      await IdentityMicroservice.revokeIdentity(
        { body: identityRevokeDto },
        this.context,
      );
    }
  }

  public async runExecutor(input: any): Promise<any> {
    console.info('RUN EXECUTOR (UpdateKiltStatusWorker). data: ', input);

    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (result: any, ctx) => {
        const incomingTx = result;
        const status = incomingTx.transactionStatus;

        // TODO: Perform a join here maybe?
        const identityJob: IdentityJob = await new IdentityJob(
          {},
          ctx,
        ).populateByIdentityId(incomingTx.referenceId);

        console.log('Identity JOB: ', identityJob);

        // TODO: Logging should be better. Transaction hash?????
        if (!identityJob.exists()) {
          await this.logAms(
            ctx,
            `Job for transaction ${result.transactionHash} does not exist!`,
            true,
          );
          return;
        }

        console.log('Reference id: ', incomingTx.referenceId);

        const identity = await new Identity({}, ctx).populateById(
          identityJob.identity_id,
        );

        console.log('Transaction type: ', identityJob.state);
        console.log('Transaction status: ', status);

        switch (identityJob.state) {
          case IdentityJobState.DID_CREATE:
            if (status == TransactionStatus.CONFIRMED) {
              writeLog(LogType.INFO, 'DID CREATE step SUCCESS');

              if (await identityJob.isFinalState()) {
                await identityJob.setCompleted();
              } else {
                writeLog(LogType.INFO, 'Executing attestation ...');
                identity.state = IdentityState.DID_CREATED;
                await identity.update();
                await identityJob.setState(IdentityJobState.ATESTATION);
                await this.execAttestClaim(identity);
              }
            } else {
              // Set identity job status to FAILED
              await identityJob.setFailed();

              if (await identityJob.identityJobRetry()) {
                writeLog(LogType.INFO, `DID CREATE step FAILED. Retrying ...`);

                await this.execIdentityGenerate(
                  identity.email,
                  identityJob.data.did_create_op,
                );

                identity.state = IdentityState.SUBMITTED_DID_CREATE_REQ;
                await identity.update();
              } else {
                writeLog(
                  LogType.INFO,
                  `DID CREATE step FAILED | Retry exceeded: STOPPING`,
                );
                // TODO: Notification logic
              }
            }
            break;
          case IdentityJobState.ATESTATION:
            writeLog(LogType.INFO, 'ATTESTATION RECEIVED ... ');
            if (status == TransactionStatus.CONFIRMED) {
              writeLog(LogType.INFO, 'ATTESTATION step SUCCESS');
              if (await identityJob.isFinalState()) {
                writeLog(LogType.INFO, 'Final state reached!!');
                await identityJob.setCompleted();
              }
              identity.state = IdentityState.ATTESTED;
              await identity.update();
            } else if (status == TransactionStatus.FAILED) {
              await identityJob.setFailed();

              if (await identityJob.identityJobRetry()) {
                writeLog(LogType.INFO, `ATTESTATION step FAILED. Retrying ...`);
                await this.logAms(
                  ctx,
                  `ATTESTATION step FAILED. Retrying ...`,
                  true,
                );
                await this.execAttestClaim(identity);
              } else {
                writeLog(
                  LogType.INFO,
                  'ATTESTATION step FAILED | Retry exceeded: STOPPING',
                );
                await this.logAms(
                  `ATTESTATION step FAILED | Retry exceeded: STOPPING`,
                  true,
                  incomingTx,
                );
                // TODO: Notification logic
              }
            }

            break;
          case IdentityJobState.DID_REVOKE:
            if (status == TransactionStatus.CONFIRMED) {
              console.log('Step REVOKED: success');
              identity.state = IdentityState.REVOKED;
              await identityJob.setCompleted();
              await identity.update();
            } else {
              if (await identityJob.identityJobRetry()) {
                writeLog(LogType.INFO, 'REVOKE step FAILED. Retrying ...');
                await this.execAttestClaim(identity);
              } else {
                writeLog(
                  LogType.INFO,
                  `REVOKE step FAILED | Retry exceeded: STOPPING`,
                );
                await this.logAms(
                  ctx,
                  'REVOKE step FAILED. Retrying ...',
                  true,
                  incomingTx,
                );
                // TODO: Notification logic
              }
            }
            break;
          default:
            await this.logAms(
              ctx,
              'Invalid transaction type',
              true,
              incomingTx,
            );
            break;
        }
      },
    );
  }
}
