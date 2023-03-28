import {
  connect,
  ConfigService,
  KiltKeyringPair,
  Blockchain,
  Did,
  DidUri,
} from '@kiltprotocol/sdk-js';
import { env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';

import { Identity } from '../modules/identity/models/identity.model';
import {
  AuthenticationErrorCode,
  HttpStatus,
  IdentityState,
} from '../config/types';
import { generateAccount } from '../lib/kilt';
import { AuthenticationCodeException } from '../lib/exceptions';

export class IdentityRevokeWorker extends BaseQueueWorker {
  context;

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

  public async runExecutor(parameters: any): Promise<any> {
    const claimerEmail = parameters.email;

    const identity = await new Identity({}, this.context).populateByUserEmail(
      this.context,
      claimerEmail,
    );

    if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
      });
    }

    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    // This is the attesterAcc, used elsewhere in the code
    const depositPayerAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    const identifier = Did.toChain(identity.didUri as DidUri);

    const endpointsCountForDid = await api.query.did.didEndpointsCount(
      identifier,
    );
    const depositReClaimExtrinsic = api.tx.did.reclaimDeposit(
      identifier,
      endpointsCountForDid,
    );

    try {
      await new Lmas().writeLog({
        logType: LogType.INFO,
        message: `Propagating DID delete TX to KILT BC ...`,
        location: 'AUTHENTICATION-API/identity/identity-revoke',
        service: ServiceName.AUTHENTICATION_API,
        data: { email: claimerEmail, didUri: identity.didUri },
      });
      await Blockchain.signAndSubmitTx(
        depositReClaimExtrinsic,
        depositPayerAccount,
      );
    } catch (error) {
      await new Lmas().writeLog({
        message: error,
        logType: LogType.ERROR,
        location: 'Authentication-API/identity/identity-revoke',
        service: ServiceName.AUTHENTICATION_API,
        data: { email: claimerEmail, didUri: identity.didUri },
      });
    }

    return true;
  }
}
