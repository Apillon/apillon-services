import {
  connect,
  ConfigService,
  KiltKeyringPair,
  Blockchain,
  Did,
  DidUri,
} from '@kiltprotocol/sdk-js';
import {
  CodeException,
  Context,
  env,
  Lmas,
  LogType,
  ServiceName,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { generateAccount } from '../lib/kilt';
import { Identity } from '../modules/identity/models/identity.model';
import { AuthenticationErrorCode, IdentityState } from '../config/types';
import { HttpStatus } from '@nestjs/common';
import { AuthenticationApiContext } from '../context';

export class IdentityRevokeWorker extends BaseQueueWorker {
  context: AuthenticationApiContext;

  public constructor(
    workerDefinition: WorkerDefinition,
    context: AuthenticationApiContext,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.AUTH_AWS_WORKER_SQS_URL);
    this.context = context;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(parameters: any): Promise<any> {
    const identity = await new Identity({}, this.context).populateByUserEmail(
      this.context,
      parameters.email,
    );

    if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    // This is the attester account, used elsewhere in the code
    const depositPayerAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    const identifier = Did.toChain(identity.didUri as DidUri);

    const endpointsCountForDid = await api.query.did.didEndpointsCount(
      identifier,
    );
    const depositClaimExtrinsic = api.tx.did.reclaimDeposit(
      identifier,
      endpointsCountForDid,
    );

    try {
      await new Lmas().writeLog({
        logType: LogType.INFO,
        message: `Propagating DID delete TX to KILT BC ...`,
        location: 'AUTHENTICATION-API/identity/identity-revoke',
        service: ServiceName.AUTHENTICATION_API,
      });
      await Blockchain.signAndSubmitTx(
        depositClaimExtrinsic,
        depositPayerAccount,
      );
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        location: 'Authentication-API/identity/identity-revoke',
        service: ServiceName.AUTHENTICATION_API,
        data: error,
      });
    }

    return true;
  }
}
