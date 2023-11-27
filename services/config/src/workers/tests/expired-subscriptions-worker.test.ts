import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { ExpiredSubscriptionsWorker } from '../expired-subscriptions-worker';
import { Subscription } from '../../modules/subscription/models/subscription.model';
import { SqlModelStatus, getFaker } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { QuotaWarningLevel } from '../../config/types';

describe('ExpiredSubscriptionsWorker integration test', () => {
  let stage: Stage;
  const project_uuid = uuidV4();
  const subscriptionStripeId = 'test123';
  let expiredSubscriptionsWorker: ExpiredSubscriptionsWorker;

  beforeAll(async () => {
    stage = await setupTest();
    const expiredSubscriptionsWorkerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-expired-subscriptions-worker',
      { parameters: {} },
    );
    expiredSubscriptionsWorker = new ExpiredSubscriptionsWorker(
      expiredSubscriptionsWorkerDefinition,
      stage.context,
    );

    await new Subscription(
      {
        project_uuid,
        subscriberEmail: getFaker().internet.email(),
        expiresOn: daysAgo(31), // Expired last month
        package_id: 3,
        stripeId: subscriptionStripeId,
        status: SqlModelStatus.ACTIVE,
      },
      stage.context,
    ).insert();

    await stage.storageContext.mysql.paramExecute(
      `
        INSERT INTO \`bucket\`
        (project_uuid, bucket_uuid, name, size, bucketType, status)
        VALUES ('${project_uuid}', '${uuidV4()}', 'test-bucket', 10000000000, 1, ${
        SqlModelStatus.ACTIVE
      });
      `,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('ExpiredSubscriptionsWorker should identify expired subscriptions', async () => {
    const projects =
      await expiredSubscriptionsWorker.getProjectsExceedingStorage();
    expect(projects.length).toBe(1);
  });

  test('ExpiredSubscriptionsWorker should update quota warning level for subscriptions expired 3 days ago', async () => {
    await expiredSubscriptionsWorker.run();
    const subscription = await new Subscription(
      {},
      stage.context,
    ).populateByStripeId(subscriptionStripeId);
    // Second warning has been sent
    expect(subscription.quotaWarningLevel).toBe(QuotaWarningLevel.THREE_DAYS);
  });

  test('ExpiredSubscriptionsWorker should update quota warning level for subscriptions expired 15 days ago', async () => {
    await expiredSubscriptionsWorker.run();
    const subscription = await new Subscription(
      {},
      stage.context,
    ).populateByStripeId(subscriptionStripeId);
    // Second warning has been sent
    expect(subscription.quotaWarningLevel).toBe(QuotaWarningLevel.FIFTEEN_DAYS);
  });

  test('ExpiredSubscriptionsWorker should update quota warning level for subscriptions expired 30 days ago', async () => {
    await expiredSubscriptionsWorker.run();
    const subscription = await new Subscription(
      {},
      stage.context,
    ).populateByStripeId(subscriptionStripeId);
    // Third warning has been sent
    expect(subscription.quotaWarningLevel).toBe(QuotaWarningLevel.THIRTY_DAYS);
  });

  test('ExpiredSubscriptionsWorker should release resources if all warnings ignored', async () => {
    await expiredSubscriptionsWorker.run();
    const subscription = await new Subscription(
      {},
      stage.context,
    ).populateByStripeId(subscriptionStripeId);
    // Third warning has been sent
    expect(subscription.quotaWarningLevel).toBe(
      QuotaWarningLevel.RESOURCES_RELEASED,
    );

    // TODO: test file deletion logic
  });
});

const daysAgo = (days: number) => {
  const today = new Date();

  const daysAgo = new Date(today);
  daysAgo.setDate(today.getDate() - days);

  return daysAgo;
};
