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

import { Transaction as BlockchainTransaction } from '../../../../../blockchain/src/common/models/transaction';
import { TransactionWebhookWorker } from '../../../../../blockchain/src/workers/transaction-webhook-worker';
import { Transaction } from '../../transaction/models/transaction.model';
import { Context } from '@apillon/lib';
import { TransactionService } from '../../transaction/transaction.service';
import { UpdateStateWorker } from '../../../workers/update-state.worker';

async function insertIdentityServiceControlTx(
  txHash: string,
  identity_id: number,
  context: Context,
) {
  const dbTxRecord: Transaction = new Transaction({}, context);
  dbTxRecord.populate({
    transactionHash: txHash,
    transactionType: TransactionType.DID_CREATE,
    refTable: DbTables.IDENTITY,
    refId: identity_id,
    transactionStatus: TransactionStatus.PENDING,
  });
  await TransactionService.saveTransaction(dbTxRecord);
}

describe('Identity generate tests', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
  });

  // test('update state worker success', async () => {
  //   const controlTxHash1 =
  //     '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c1';
  //   const controlTxHash2 =
  //     '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c2';
  //   const identity = await new Identity(
  //     {
  //       email: 'test@example.com',
  //       didUri: 'did:kilt:4s9BEXVYoK4asirexpDYgaSKvmMfjdnN2V4XxYWRtfekyZ7w',
  //       credential: null,
  //       state: IdentityState.IDENTITY_VERIFIED,
  //     },
  //     stage.authApiContext,
  //   ).insert();

  //   // DID CREATE REQUEST
  //   await insertBlockchainServiceControlTx(
  //     stage.blockchainContext,
  //     identity.id,
  //     controlTxHash1,
  //     TransactionType.DID_CREATE,
  //   );

  //   // TODO: Add batch insert
  //   await insertIdentityServiceControlTx(
  //     controlTxHash1,
  //     identity.id,
  //     stage.authApiContext,
  //   );

  //   const serviceDef: ServiceDefinition = {
  //     type: ServiceDefinitionType.SQS,
  //     config: { region: 'test' },
  //     params: { FunctionName: 'test' },
  //   };
  //   const wd1 = new WorkerDefinition(serviceDef, 'TransactionWebhooks', {});
  //   const worker1 = new TransactionWebhookWorker(
  //     wd1,
  //     stage.blockchainContext,
  //     QueueWorkerType.EXECUTOR,
  //   );

  //   // Call worker
  //   await worker1.runExecutor({
  //     devContext: stage.authApiContext,
  //   });

  //   let identityControl = await new Identity(
  //     {},
  //     stage.authApiContext,
  //   ).populateById(identity.id);

  //   expect(identityControl.state).toEqual(
  //     IdentityState.SUBMITTED_ATTESATION_REQ,
  //   );

  //   // ATTESTATION REQUEST
  //   await insertBlockchainServiceControlTx(
  //     stage.blockchainContext,
  //     identity.id,
  //     controlTxHash2,
  //     TransactionType.ATTESTATION,
  //   );

  //   await insertIdentityServiceControlTx(
  //     controlTxHash2,
  //     identity.id,
  //     stage.authApiContext,
  //   );

  //   // Call worker ej sekond tajm
  //   await worker1.runExecutor({
  //     devContext: stage.authApiContext,
  //   });

  //   identityControl = await new Identity({}, stage.authApiContext).populateById(
  //     identity.id,
  //   );

  //   expect(identityControl.state).toEqual(IdentityState.ATTESTED);
  // });

  test('update state worker fail', async () => {
    const controlTxHash1 =
      '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c3';
    const controlTxHash2 =
      '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c4';
    const controlTxHash3 =
      '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c5';
    const identity = await new Identity(
      {
        email: 'test_2@example.com',
        didUri: 'did:kilt:4s9BEXVYoK4asirexpDYgaSKvmMfjdnN2V4XxYWRtfekyZ7w',
        credential: null,
        state: IdentityState.IDENTITY_VERIFIED,
      },
      stage.authApiContext,
    ).insert();

    await insertIdentityServiceControlTx(
      controlTxHash1,
      identity.id,
      stage.authApiContext,
    );

    await insertIdentityServiceControlTx(
      controlTxHash1,
      identity.id,
      stage.authApiContext,
    );

    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const wd1 = new WorkerDefinition(serviceDef, 'UpdateStateWorker', {});
    const worker1 = new UpdateStateWorker(
      wd1,
      stage.authApiContext,
      QueueWorkerType.EXECUTOR,
    );

    // Call worker
    await worker1.runExecutor({
      transactionHash: controlTxHash1,
      data: {
        transactionType: TransactionType.DID_CREATE,
        transactionStatus: TransactionStatus.FAILED,
      },
    });

    const idCtrl = await new Identity({}, stage.authApiContext).populateById(
      identity.id,
    );

    expect(idCtrl.state).toEqual(IdentityState.IDENTITY_VERIFIED);

    await insertIdentityServiceControlTx(
      controlTxHash2,
      identity.id,
      stage.authApiContext,
    );

    // Call worker
    await worker1.runExecutor({
      transactionHash: controlTxHash2,
      data: {
        transactionType: TransactionType.DID_CREATE,
        transactionStatus: TransactionStatus.FAILED,
      },
    });

    const idCtr2 = await new Identity({}, stage.authApiContext).populateById(
      identity.id,
    );

    expect(idCtr2.state).toEqual(IdentityState.SUBMITTED_ATTESATION_REQ);

    // await insertIdentityServiceControlTx(
    //   controlTxHash3,
    //   identity.id,
    //   stage.authApiContext,
    // );

    // // Call worker
    // await worker1.runExecutor({});

    // const idCtr3 = await new Identity({}, stage.authApiContext).populateById(
    //   identity.id,
    // );

    // expect(idCtr3.state).toEqual(IdentityState.ATTESTED);
  });
});
