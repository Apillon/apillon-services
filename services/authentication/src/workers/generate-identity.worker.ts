import { u8aToHex, hexToU8a, BN } from '@polkadot/util';
import {
  connect,
  ConfigService,
  KiltKeyringPair,
  Utils,
  Blockchain,
  Did,
  ICredential,
} from '@kiltprotocol/sdk-js';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';

import { Identity } from '../modules/identity/models/identity.model';
import {
  ApillonSupportedCTypes,
  Attester,
  AuthenticationErrorCode,
  HttpStatus,
  IdentityGenFlag,
  IdentityState,
  KiltSignAlgorithm,
} from '../config/types';
import {
  generateKeypairs,
  generateAccount,
  getFullDidDocument,
  createAttestationRequest,
  getNextNonce,
  getCtypeSchema,
} from '../lib/kilt';
import { env, Lmas, LogType, ServiceName } from '@apillon/lib';
import { AuthenticationCodeException } from '../lib/exceptions';

export class IdentityGenerateWorker extends BaseQueueWorker {
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

  public async runExecutor(params: any): Promise<any> {
    console.log('Starting attestation process ...');
    // Prepare identity instance and credential structure\
    return false;
  }
}
