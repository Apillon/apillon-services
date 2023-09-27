import {
  AppEnvironment,
  AttestationDto,
  IdentityCreateDto,
  IdentityDidRevokeDto,
  IdentityLinkAccountDidDto,
  LogType,
  Mailing,
  ServiceName,
  TransactionStatus,
  env,
  generateJwtToken,
  runWithWorkers,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  AuthApiEmailType,
  IdentityJobState,
  IdentityState,
  JwtTokenType,
} from '../config/types';
import { Identity } from '../modules/identity/models/identity.model';
import { IdentityMicroservice } from '../modules/identity/identity.service';
import { IdentityJob } from '../modules/identity-job/models/identity-job.model';

// TODO: Consider managing by transaction status and not by identity job state
// The diagram shoul be as follows: check if success and trigger correct operation. That's it.
// TODO2: Ideally we would have a configuration
// where we specify each flow and handle that based on the confi, current state and the
// received transaction status.

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

  private async execAttestClaim(identity: Identity, linkParameters: object) {
    const attestationClaimDto = new AttestationDto().populate({
      email: identity.email,
      didUri: identity.didUri,
      token: identity.token,
      linkParameters: linkParameters,
    });

    if (env.APP_ENV != AppEnvironment.TEST) {
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

  private async execIdentityRevoke(params: any) {
    const identityRevokeDto = new IdentityDidRevokeDto().populate({
      email: params.email,
      token: params.token,
    });

    if (env.APP_ENV != AppEnvironment.TEST) {
      await IdentityMicroservice.revokeIdentity(
        { body: identityRevokeDto },
        this.context,
      );
    }
  }

  private async execIdentityLinkAccToDid(params: any) {
    const identityLinkDto = new IdentityLinkAccountDidDto().populate({
      email: params.email,
      token: params.token,
    });
    await IdentityMicroservice.linkAccountDid(
      { body: identityLinkDto },
      this.context,
    );
    if (env.APP_ENV != AppEnvironment.TEST) {
      await IdentityMicroservice.linkAccountDid(
        { body: identityLinkDto },
        this.context,
      );
    }
  }

  public async runExecutor(input: any): Promise<any> {
    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `RUN EXECUTOR (UpdateKiltStatusWorker). data: ${input}`,
        service: ServiceName.AUTHENTICATION_API,
      },
      LogOutput.DEBUG,
    );

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

        if (!identityJob.exists()) {
          await this.writeEventLog({
            logType: LogType.ERROR,
            message: `Job for transaction ${result.transactionHash} does not exist!`,
            service: ServiceName.AUTHENTICATION_API,
            data: {
              identityJobId: incomingTx.referenceId,
            },
          });
          return;
        }

        const identity = await new Identity({}, ctx).populateById(
          identityJob.identity_id,
        );

        const email = identity.email;

        switch (identityJob.state) {
          case IdentityJobState.DID_CREATE:
            if (status == TransactionStatus.CONFIRMED) {
              await this.writeEventLog({
                logType: LogType.INFO,
                message: 'DID CREATE step SUCCESS',
                service: ServiceName.AUTHENTICATION_API,
                data: {
                  identity: identity.id,
                  did: identity.didUri,
                },
              });

              if (await identityJob.isFinalState()) {
                await identityJob.setCompleted();
              } else {
                await this.writeEventLog(
                  {
                    logType: LogType.INFO,
                    message: 'Executing attestation ...',
                    service: ServiceName.AUTHENTICATION_API,
                  },
                  LogOutput.DEBUG,
                );

                identity.state = IdentityState.DID_CREATED;
                await identity.update();
                await identityJob.setState(IdentityJobState.ATESTATION);
                await this.execAttestClaim(
                  identity,
                  identityJob.data.linkParameters,
                );
              }
            } else {
              // Set identity job status to FAILED
              await identityJob.setFailed();

              if (await identityJob.identityJobRetry()) {
                await this.writeEventLog({
                  logType: LogType.ERROR,
                  message: `DID CREATE step for ${result.transactionHash} FAILED. Retrying transaction`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {
                    identityJob: identityJob.id,
                    identity: identity.id,
                  },
                });

                await this.execIdentityGenerate(
                  email,
                  identityJob.data.did_create_op,
                );

                identity.state = IdentityState.SUBMITTED_DID_CREATE_REQ;
                await identity.update();
              } else {
                // TODO: Notification logic

                await this.writeEventLog({
                  logType: LogType.ERROR,
                  message: `DID CREATE step for ${result.transactionHash} FAILED. Retry exceeded: STOPPING`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {
                    identityJob: identityJob.id,
                    identity: identity.id,
                  },
                });
              }
            }
            break;
          case IdentityJobState.ATESTATION:
            if (status == TransactionStatus.CONFIRMED) {
              await this.writeEventLog({
                logType: LogType.INFO,
                message: 'ATTESTATION step SUCCESS',
                service: ServiceName.AUTHENTICATION_API,
                data: {
                  identity: identity.id,
                  did: identity.didUri,
                },
              });
              if (await identityJob.isFinalState()) {
                await this.writeEventLog(
                  {
                    logType: LogType.INFO,
                    message: 'ATTESTATION final stage REACHED',
                    service: ServiceName.AUTHENTICATION_API,
                  },
                  LogOutput.DEBUG,
                );

                await identityJob.setCompleted();

                const token = generateJwtToken(
                  JwtTokenType.IDENTITY_VERIFICATION,
                  {
                    email,
                  },
                );

                await new Mailing(ctx).sendMail({
                  emails: [email],
                  template: AuthApiEmailType.DOWNLOAD_IDENTITY,
                  data: {
                    actionUrl: `${env.AUTH_APP_URL}/restore/?token=${token}&email=${email}&type=${AuthApiEmailType.DOWNLOAD_IDENTITY}`,
                  },
                });
              }
              identity.state = IdentityState.ATTESTED;
              await identity.update();
            } else if (status == TransactionStatus.FAILED) {
              await identityJob.setFailed();

              if (await identityJob.identityJobRetry()) {
                await this.writeEventLog({
                  logType: LogType.ERROR,
                  message: `ATTESTATION step for ${result.transactionHash} FAILED. Retrying transaction`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {
                    identityJob: identityJob.id,
                    identity: identity.id,
                  },
                });
                await this.execAttestClaim(
                  identity,
                  identityJob.data.linkParameters,
                );
              } else {
                await this.writeEventLog({
                  logType: LogType.ERROR,
                  message: `ATTESTATION for ${result.transactionHash} step FAILED. Retry exceeded: STOPPING`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {
                    identityJob: identityJob.id,
                    identity: identity.id,
                  },
                });
                // TODO: Notification logic
              }
            }

            break;

          case IdentityJobState.ACC_DID_LINK:
            if (status == TransactionStatus.CONFIRMED) {
              await this.writeEventLog({
                logType: LogType.INFO,
                message: `Successfully linked ACCOUNT to DID`,
                service: ServiceName.AUTHENTICATION_API,
                data: {
                  identity: identity.id,
                  did: identity.didUri,
                },
              });

              identity.state = IdentityState.ATTESTED_AND_LINKED;
              await identityJob.setCompleted();
              await identity.update();
            } else {
              if (await identityJob.identityJobRetry()) {
                await this.writeEventLog({
                  logType: LogType.ERROR,
                  message: `ACC link to DID for ${result.transactionHash} step FAILED. Retrying transaction`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {
                    identityJob: identityJob.id,
                    identity: identity.id,
                  },
                });
                await this.execIdentityLinkAccToDid(identity);
              } else {
                await this.writeEventLog({
                  logType: LogType.ERROR,
                  message: `ACC link to DID for ${result.transactionHash} step FAILED. Retry exceeded: STOPPING`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {
                    identityJob: identityJob.id,
                    identity: identity.id,
                  },
                });
                // TODO: Notification logic
              }
            }
          case IdentityJobState.DID_REVOKE:
            if (status == TransactionStatus.CONFIRMED) {
              await this.writeEventLog({
                logType: LogType.INFO,
                message: `REVOKED step SUCCESS`,
                service: ServiceName.AUTHENTICATION_API,
                data: {
                  identity: identity.id,
                  did: identity.didUri,
                },
              });

              identity.state = IdentityState.REVOKED;
              await identityJob.setCompleted();
              await identity.update();
            } else {
              if (await identityJob.identityJobRetry()) {
                await this.writeEventLog({
                  logType: LogType.ERROR,
                  message: `REVOKE for ${result.transactionHash} step FAILED. Retrying transaction`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {
                    identityJob: identityJob.id,
                    identity: identity.id,
                  },
                });
                await this.execIdentityRevoke(identity);
              } else {
                await this.writeEventLog({
                  logType: LogType.ERROR,
                  message: `REVOKE for ${result.transactionHash} step FAILED. Retry exceeded: STOPPING`,
                  service: ServiceName.AUTHENTICATION_API,
                  data: {
                    identityJob: identityJob.id,
                    identity: identity.id,
                  },
                });
                // TODO: Notification logic
              }
            }
            break;
          default:
            await this.writeEventLog({
              logType: LogType.ERROR,
              message: `Invalid transaction state`,
              service: ServiceName.AUTHENTICATION_API,
              data: {
                incomingTx: incomingTx,
              },
            });
            break;
        }
      },
    );
  }
}
