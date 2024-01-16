import {
  EmailDataDto,
  EmailTemplate,
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
  IdentityConfigKey,
  IdentityJobState,
  IdentityState,
} from '../../config/types';
import { Identity } from '../../modules/identity/models/identity.model';
import { IdentityJob } from '../../modules/identity-job/models/identity-job.model';
import * as procedures from './procedures';
import { JwtTokenType } from '@apillon/lib';
import { IdentityConfig } from '../../modules/identity/models/identity-config.model';

// TODO: Consider managing by transaction status and not by identity job state
// The diagram shoul be as follows: check if success and trigger correct operation. That's it.
// TODO2: Ideally we would have a configuration
// where we specify each flow and handle that based on the config, current state and the
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
                await procedures.attestClaim(
                  this.context,
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

                await procedures.identityGenerate(
                  this.context,
                  email,
                  identityJob.data.did_create_op,
                );

                identity.state = IdentityState.SUBMITTED_DID_CREATE_REQ;
                await identity.update();
              } else {
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

              // Update identity
              identity.state = IdentityState.ATTESTED;
              await identity.update();

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
                  '10min',
                );

                await new Mailing(ctx).sendMail(
                  new EmailDataDto({
                    mailAddresses: [email],
                    templateName: EmailTemplate.DOWNLOAD_IDENTITY,
                    templateData: {
                      actionUrl: `${env.AUTH_APP_URL}/restore/?token=${token}&email=${email}&type=${EmailTemplate.DOWNLOAD_IDENTITY}`,
                    },
                  }),
                );
              } else if (
                identityJob.finalState == IdentityJobState.ACC_DID_LINK
              ) {
                await procedures.linkAccToDid(this.context, identityJob.data);
              }
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
                // Decrease DID tx counter by 1 since attestation failed
                await new IdentityConfig({}, ctx).updateNumericKeyValue(
                  IdentityConfigKey.ATTESTER_DID_TX_COUNTER,
                  -1,
                );
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
                await procedures.linkAccToDid(this.context, identityJob.data);
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
                await procedures.identityRevoke(identity);
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
