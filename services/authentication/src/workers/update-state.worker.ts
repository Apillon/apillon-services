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
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Transaction } from '../modules/transaction/models/transaction.model';
import {
  IdentityJobStage,
  IdentityState,
  TransactionType,
} from '../config/types';
import { Identity } from '../modules/identity/models/identity.model';
import { IdentityMicroservice } from '../modules/identity/identity.service';
import { IdentityJobService as idjs } from '../modules/identity-job/identity-job.service';
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

  private async logAms(
    contex?: any,
    message?: any,
    error?: boolean,
    wallet?: string,
    data?: any,
  ) {
    await new Lmas().writeLog({
      context: contex,
      logType: error ? LogType.ERROR : LogType.INFO,
      message: message,
      location: `${this.constructor.name}`,
      service: ServiceName.AUTHENTICATION_API,
      data: {
        wallet,
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
      await IdentityMicroservice.attestClaim(
        { body: attestationClaimDto },
        this.context,
      );
    }
  }

  private async execIdentityGenerate(identity: Identity, incomignTxData: any) {
    const identityCreateDto = new IdentityCreateDto().populate({
      email: incomignTxData.email,
      did_create_op: incomignTxData.did_create_op,
    });

    identity.state = IdentityState.SUBMITTED_DID_CREATE_REQ;
    await identity.update();

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
    console.info('RUN EXECUTOR (UpdateCrustStatusWorker). data: ', input);

    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (result: any, ctx) => {
        const incomingTx = result;

        const incomignTxData = incomingTx.data;

        const status = incomingTx.transactionStatus;
        const txType = incomignTxData.transactionType;

        const transaction: Transaction = await new Transaction(
          {},
          ctx,
        ).populateByTransactionHash(incomingTx.transactionHash);

        // TODO: Perform a join here maybe?
        const identityJob: IdentityJob = await new IdentityJob(
          {},
          ctx,
        ).populateByIdentityId(incomingTx.referenceId);

        console.log('Identity JOB: ', identityJob);

        if (!transaction.exists()) {
          await this.logAms(
            ctx,
            `Transaction for hash ${result.transactionHash} does not exist!`,
            true,
          );
          return;
        }

        status == TransactionStatus.CONFIRMED
          ? await this.logAms(
              ctx,
              `Transaction ${transaction.transactionType} SUCCESS`,
            )
          : await this.logAms(
              ctx,
              `Transaction ${transaction.transactionType} FAILED`,
              true,
            );

        // Update status
        transaction.transactionStatus = status;
        await transaction.update();

        console.log('Reference id: ', incomingTx.referenceId);

        const identity = await new Identity({}, ctx).populateById(
          incomingTx.referenceId,
        );

        console.log('Transaction type: ', txType);
        console.log('Transaction status: ', status);

        switch (txType) {
          case TransactionType.DID_CREATE:
            if (status == TransactionStatus.CONFIRMED) {
              console.log('DID CREATE step SUCCESS');

              if (await identityJob.isFinalStage()) {
                await identityJob.setCompleted();
              } else {
                console.log('Executing attestation stage ...');
                identity.state = IdentityState.DID_CREATED;
                await identity.update();
                await identityJob.setCurrentStage(IdentityJobStage.ATESTATION);
                await this.execAttestClaim(identity);
              }
            } else {
              // Set identity job status to FAILED
              await identityJob.setFailed();

              if (await identityJob.identityJobRetry()) {
                console.log(`DID CREATE step FAILED. Retrying ...`);
                await this.execIdentityGenerate(identity, incomignTxData);
              } else {
                console.log(
                  `DID CREATE step FAILED | Retry exceeded: STOPPING`,
                );
                // TODO: Notification logic
              }
            }
            break;
          case TransactionType.ATTESTATION:
            console.log('ATTESTATION RECEIVED ... ');
            if (status == TransactionStatus.CONFIRMED) {
              console.log('ATTESTATION step SUCCESS');
              if (await identityJob.isFinalStage()) {
                console.log('final stage reached!!');
                await identityJob.setCompleted();
              }
              identity.state = IdentityState.ATTESTED;
              await identity.update();
            } else if (status == TransactionStatus.FAILED) {
              await identityJob.setFailed();

              if (await identityJob.identityJobRetry()) {
                console.log(`ATTESTATION step FAILED. Retrying ...`);
                await this.execAttestClaim(identity);
              } else {
                console.log(
                  `ATTESTATION step FAILED | Retry exceeded: STOPPING`,
                );
                // TODO: Notification logic
              }
            }

            break;
          case TransactionType.DID_REVOKE:
            if (status == TransactionStatus.CONFIRMED) {
              console.log('Step REVOKED: success');
              identity.state = IdentityState.REVOKED;
              await identityJob.setCompleted();
              await identity.update();
            } else {
              if (await identityJob.identityJobRetry()) {
                console.log(`REVOKE step FAILED. Retrying ...`);
                await this.execAttestClaim(identity);
              } else {
                console.log(`REVOKE step FAILED | Retry exceeded: STOPPING`);
                // TODO: Notification logic
              }
            }
            break;
          default:
            await this.logAms(ctx, 'Invalid transaction type', true);
            break;
        }
      },
    );
  }
}
