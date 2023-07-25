import { TransactionStatus } from '@apillon/lib/dist/config/types';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  QueueWorkerType,
} from '@apillon/workers-lib';

import { Stage, releaseStage, setupTest } from '../../../../test/setup';
import { IdentityJobState, IdentityState } from '../../../config/types';
import { Identity } from '../models/identity.model';
import { UpdateStateWorker } from '../../../workers/update-state.worker';
import { IdentityJob } from '../../identity-job/models/identity-job.model';
import { IdentityJobService } from '../../identity-job/identity-job.service';

describe('Identity generate tests', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('update state worker fail', async () => {
    const controlTxHash1 =
      '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c3';
    const controlTxHash2 =
      '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c4';
    const controlTxHash3 =
      '0xb532c8bae0a61c6fd715c8461b4e076c3ef5ae91210213a809d281dc5ab689c5';
    const controlTxHash4 =
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

    // Transaction 1 fails
    const identityJob = await IdentityJobService.createOrGetIdentityJob(
      stage.authApiContext,
      identity.id,
      IdentityJobState.ATESTATION,
      { did_create_op: 'He-he-he' },
    );
    await identityJob.setState(IdentityJobState.DID_CREATE);

    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const wd1 = new WorkerDefinition(serviceDef, 'UpdateStateWorker', {});
    const worker = new UpdateStateWorker(
      wd1,
      stage.authApiContext,
      QueueWorkerType.EXECUTOR,
    );

    // Call worker
    await worker.runExecutor({
      data: [
        {
          referenceId: identityJob.id,
          transactionHash: controlTxHash1,
          transactionStatus: TransactionStatus.FAILED,
        },
      ],
    });

    const idCtrl = await new Identity({}, stage.authApiContext).populateById(
      identity.id,
    );
    expect(idCtrl.state).toEqual(IdentityState.SUBMITTED_DID_CREATE_REQ);

    const identityJobCtrl = await new IdentityJob(
      {},
      stage.authApiContext,
    ).populateByIdentityId(idCtrl.id);

    expect(identityJobCtrl.retries).toEqual(1);
    expect(identityJobCtrl.completedAt).toEqual(null);
    expect(identityJobCtrl.state).toEqual(IdentityJobState.DID_CREATE);
    expect(identityJobCtrl.finalState).toEqual(IdentityJobState.ATESTATION);
    expect(identityJobCtrl.lastFailed).not.toBeNull();

    // Call worker
    await worker.runExecutor({
      data: [
        {
          referenceId: identityJob.id,
          transactionHash: controlTxHash2,
          transactionStatus: TransactionStatus.CONFIRMED,
        },
      ],
    });

    const idCtr2 = await new Identity({}, stage.authApiContext).populateById(
      identity.id,
    );

    expect(idCtr2.state).toEqual(IdentityState.DID_CREATED);

    const identityJobCtrl2 = await new IdentityJob(
      {},
      stage.authApiContext,
    ).populateByIdentityId(idCtrl.id);

    expect(identityJobCtrl2.retries).toEqual(0);
    expect(identityJobCtrl2.completedAt).toEqual(null);
    expect(identityJobCtrl2.lastFailed).not.toBeNull();
    expect(identityJobCtrl2.state).toEqual(IdentityJobState.ATESTATION);

    // Call worker
    await worker.runExecutor({
      data: [
        {
          referenceId: identityJob.id,
          transactionHash: controlTxHash3,
          transactionStatus: TransactionStatus.FAILED,
        },
      ],
    });

    const idCtr3 = await new Identity({}, stage.authApiContext).populateById(
      identity.id,
    );

    expect(idCtr3.state).toEqual(IdentityState.DID_CREATED);

    const identityJobCtrl3 = await new IdentityJob(
      {},
      stage.authApiContext,
    ).populateByIdentityId(idCtr3.id);

    expect(identityJobCtrl3.retries).toEqual(1);
    expect(identityJobCtrl3.lastError).toBeNull();
    expect(identityJobCtrl3.completedAt).toBeNull();
    expect(identityJobCtrl3.state).toEqual(IdentityJobState.ATESTATION);

    // Call worker
    await worker.runExecutor({
      data: [
        {
          referenceId: identityJob.id,
          transactionHash: controlTxHash4,
          transactionStatus: TransactionStatus.CONFIRMED,
        },
      ],
    });

    const idCtr4 = await new Identity({}, stage.authApiContext).populateById(
      identity.id,
    );

    expect(idCtr4.state).toEqual(IdentityState.ATTESTED);

    const identityJobCtrl4 = await new IdentityJob(
      {},
      stage.authApiContext,
    ).populateByIdentityId(idCtr4.id);

    // Set completed does not reset retries - it just finishes the job.
    expect(identityJobCtrl4.retries).toEqual(1);
    expect(identityJobCtrl4.lastError).toBeNull();
    expect(identityJobCtrl4.completedAt).not.toBeNull();
    expect(identityJobCtrl4.state).toEqual(IdentityJobState.ATESTATION);
  });
});
