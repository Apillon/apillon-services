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

        const identityJob: IdentityJob = await new IdentityJob(
          {},
          ctx,
        ).populateById(incomingTx.referenceId);

        console.log('Identity JOB: ', identityJob);

        // TODO: Logging should be better. Transaction hash?????
        if (!identityJob.exists()) {
          await new Lmas().writeLog({
            context: this.context,
            logType: LogType.ERROR,
            message: `Job for transaction ${result.transactionHash} does not exist!`,
            location: `UpdateStateWorker`,
            service: ServiceName.AUTHENTICATION_API,
            data: {},
          });
          return;
        }

        const identity = await new Identity({}, ctx).populateById(
          identityJob.identity_id,
        );

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
                await new Lmas().writeLog({
                  context: this.context,
                  logType: LogType.ERROR,
                  message: `DID CREATE step for ${result.transactionHash} FAILED. Retrying transaction`,
                  location: `UpdateStateWorker`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {},
                });

                await this.execIdentityGenerate(
                  identity.email,
                  identityJob.data.did_create_op,
                );

                identity.state = IdentityState.SUBMITTED_DID_CREATE_REQ;
                await identity.update();
              } else {
                // TODO: Notification logic

                await new Lmas().writeLog({
                  context: this.context,
                  logType: LogType.ERROR,
                  message: `DID CREATE step for ${result.transactionHash} FAILED. Retry exceeded: STOPPING`,
                  location: `UpdateStateWorker`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {},
                });
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
                await new Lmas().writeLog({
                  context: this.context,
                  logType: LogType.ERROR,
                  message: `ATTESTATION step for ${result.transactionHash} FAILED. Retrying transaction`,
                  location: `UpdateStateWorker`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {},
                });
                await this.execAttestClaim(identity);
              } else {
                await new Lmas().writeLog({
                  context: this.context,
                  logType: LogType.ERROR,
                  message: `ATTESTATION for ${result.transactionHash} step FAILED. Retry exceeded: STOPPING`,
                  location: `UpdateStateWorker`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {},
                });
                // TODO: Notification logic
              }
            }

            break;
          case IdentityJobState.DID_REVOKE:
            if (status == TransactionStatus.CONFIRMED) {
              writeLog(LogType.INFO, 'Step REVOKED: success');

              identity.state = IdentityState.REVOKED;
              await identityJob.setCompleted();
              await identity.update();
            } else {
              if (await identityJob.identityJobRetry()) {
                await new Lmas().writeLog({
                  context: this.context,
                  logType: LogType.ERROR,
                  message: `REVOKE for ${result.transactionHash} step FAILED. Retrying transaction`,
                  location: `UpdateStateWorker`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {},
                });
                await this.execIdentityRevoke(identity);
              } else {
                await new Lmas().writeLog({
                  context: this.context,
                  logType: LogType.ERROR,
                  message: `REVOKE for ${result.transactionHash} step FAILED. Retry exceeded: STOPPING`,
                  location: `UpdateStateWorker`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {},
                });
                // TODO: Notification logic
              }
            }
            break;
          default:
            await new Lmas().writeLog({
              context: this.context,
              logType: LogType.ERROR,
              message: `Invalid transaction type`,
              location: `UpdateStateWorker`,
              service: ServiceName.AUTHENTICATION_API,
              data: {},
            });
            break;
        }
      },
    );
  }
}
