import {
  ChainType,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib/dist/config/types';
import { Stage, releaseStage, setupTest } from '../../../../test/setup';
import {
  DbTables,
  IdentityState,
  TransactionType,
} from '../../../config/types';
import { Identity } from '../models/identity.model';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  QueueWorkerType,
} from '@apillon/workers-lib';

import { Transaction } from '../../../../../blockchain/src/common/models/transaction';
import { TransactionWebhookWorker } from '../../../../../blockchain/src/workers/transaction-webhook-worker';
import { WorkerName } from '../../../workers/worker-executor';
import { UpdateStateWorker } from '../../../workers/update-state.worker';

describe('Identity generate tests', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
  });

  test('update state worker', async () => {
    const address = '4opuc6SYnkBoeT6R4iCjaReDUAmQoYmPgC3fTkECKQ6YSuHn';
    const chain = SubstrateChain.KILT;
    const chainType = ChainType.SUBSTRATE;

    const identity = await new Identity(
      {
        email: 'test@example.com',
        didUri: 'did:kilt:4rDiiH15nwgRqT3dY8PMj76hrqRC5ZDEN5B6ArphKtgGtpRL',
        credential: null,
        state: IdentityState.IDENTITY_VERIFIED,
      },
      stage.authApiContext,
    ).insert();

    await new Transaction(
      {
        address: address,
        chain: chain,
        chainType: chainType,
        transactionType: TransactionType.DID_CREATE,
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
        transactionStatus: TransactionStatus.CONFIRMED,
        rawTransaction: 'SOME_RAW_DATA',
        transactionHash:
          '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c1',
        webhookTriggered: null,
        nonce: 1,
        data: { transactionType: TransactionType.DID_CREATE },
      },
      stage.blockchainContext,
    ).insert();

    await new Transaction(
      {
        address: address,
        chain: chain,
        chainType: chainType,
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
        transactionStatus: TransactionStatus.CONFIRMED,
        rawTransaction: 'SOME_RAW_DATA',
        transactionHash:
          '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c2',
        webhookTriggered: null,
        nonce: 2,
        data: { transactionType: TransactionType.ATTESTATION },
      },
      stage.blockchainContext,
    ).insert();

    // Call the transaction webhook worker
    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const wd1 = new WorkerDefinition(serviceDef, 'TransactionWebhooks', {});
    const worker1 = new TransactionWebhookWorker(
      wd1,
      stage.blockchainContext,
      QueueWorkerType.EXECUTOR,
    );

    await worker1.runExecutor({
      devContext: stage.authApiContext,
    });
  });
});
