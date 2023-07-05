import {
  AttestationDto,
  IdentityCreateDto,
  IdentityDidRevokeDto,
  Lmas,
  LogType,
  ServiceName,
  TransactionStatus,
  TransactionWebhookDataDto,
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
  IdentityState,
  TRANSACTION_MAX_RETRIES,
  TransactionType,
} from '../config/types';
import { Identity } from '../modules/identity/models/identity.model';
import { IdentityMicroservice } from '../modules/identity/identity.service';

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
    identity.state = IdentityState.SUBMITTED_ATTESATION_REQ;
    await identity.update();
    // await IdentityMicroservice.attestClaim(
    //   { body: attestationClaimDto },
    //   this.context,
    // );
  }

  private async execIdentityGenerate(incomignTxData: any) {
    const identityCreateDto = new IdentityCreateDto().populate({
      email: incomignTxData.email,
      did_create_op: incomignTxData.did_create_op,
    });

    console.log('Ideneity create dto ', identityCreateDto);

    // await IdentityMicroservice.generateIdentity(
    //   { body: identityCreateDto },
    //   this.context,
    // );
    // await IdentityMicroservice.attestClaim(
    //   { body: attestationClaim },
    //   this.context,
    // );
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
    // await IdentityMicroservice.attestClaim(
    //   { body: attestationClaim },
    //   this.context,
    // );
  }

  private async transactionRetry(transaction: Transaction) {
    transaction.numOfRetries = transaction.numOfRetries + 1;
    await transaction.update();
    return transaction.numOfRetries < TRANSACTION_MAX_RETRIES;
  }

  public async runExecutor(input: any): Promise<any> {
    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (result: any, ctx) => {
        const incomingTx = result;
        const incomignTxData = JSON.parse(incomingTx.data);

        const status = incomingTx.transactionStatus;
        const txType = incomignTxData.transactionType;

        const transaction: Transaction = await new Transaction(
          {},
          ctx,
        ).populateByTransactionHash(incomingTx.transactionHash);
        if (transaction.exists()) {
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

          const identity = await new Identity({}, ctx).populateById(
            incomingTx.referenceId,
          );

          switch (txType) {
            case TransactionType.DID_CREATE:
              if (status == TransactionStatus.CONFIRMED) {
                console.log('Step DID CREATE: success. Next step: ATTESTATION');
                await this.execAttestClaim(identity);
              } else {
                if (await this.transactionRetry(transaction)) {
                  console.log(
                    `Step DID CREATE ==> fail | Retry count: ${transaction.numOfRetries}`,
                  );

                  console.log('Identity state: ', identity.state);

                  await this.execIdentityGenerate(incomignTxData);
                } else {
                  // TODO: Notification logic
                }
              }
              break;
            case TransactionType.ATTESTATION:
              if (status == TransactionStatus.CONFIRMED) {
                console.log('Step ATTESTATION: success');
                identity.state = IdentityState.ATTESTED;
                await identity.update();
              } else if (status == TransactionStatus.FAILED) {
                console.log(
                  `Step ATTESTATION: fail. Retry count: ${transaction.numOfRetries}`,
                );
                if (await this.transactionRetry(transaction)) {
                  await this.execAttestClaim(identity);
                }
              }

              break;
            case TransactionType.DID_REVOKE:
              if (status == TransactionStatus.CONFIRMED) {
                console.log('Step REVOKED: success');
                identity.state = IdentityState.REVOKED;
                await identity.update();
              } else {
                console.log(
                  `Step ATTESTATION ==> fail | Retry count: ${transaction.numOfRetries}`,
                );
                if (await this.transactionRetry(transaction)) {
                  await this.execAttestClaim(identity);
                }
              }
              break;
            default:
              await this.logAms(ctx, 'Invalid transaction type', true);
          }
        } else {
          await this.logAms(
            ctx,
            'Transaction for hash ${result.transactionHash} does not exist!',
            true,
          );
        }
      },
    );
  }
}
