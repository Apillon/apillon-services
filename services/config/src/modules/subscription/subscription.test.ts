import { v4 as uuid } from 'uuid';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { SubscriptionService } from './subscription.service';
import {
  CreateSubscriptionDto,
  SqlModelStatus,
  SubscriptionsQueryFilter,
  UpdateSubscriptionDto,
} from '@apillon/lib';
import { SubscriptionPackage } from './models/subscription-package.model';
import { Subscription } from './models/subscription.model';
import { Credit } from '../credit/models/credit.model';
import { ScsCodeException, ScsValidationException } from '../../lib/exceptions';
import { DbTables } from '../../config/types';

describe('Subscriptions unit test', () => {
  let stage: Stage;

  const project_uuid = uuid();
  let subscriptionPackage: SubscriptionPackage;

  beforeAll(async () => {
    stage = await setupTest();

    subscriptionPackage = await new SubscriptionPackage(
      {},
      stage.context,
    ).populateById(2); // Caterpillar plan
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('should get all subscription packages', async () => {
    const packages = await SubscriptionService.getSubscriptionPackages(
      null,
      stage.context,
    );
    expect(packages?.length).toBeGreaterThanOrEqual(4); // From seed
  });

  test('should throw when creating an invalid subscription', async () => {
    const dto = new CreateSubscriptionDto(stage.context)
      .fake()
      .populate({ project_uuid });
    const createSubscription = async (data) => {
      await SubscriptionService.createSubscription(data, stage.context, null);
    };

    // package_id not found
    await expect(
      async () => await createSubscription(dto),
    ).rejects.toThrowError(ScsCodeException);

    dto.populate({ package_id: subscriptionPackage.id, stripeId: null });
    // stripeId not present
    await expect(
      async () => await createSubscription(dto),
    ).rejects.toThrowError(ScsValidationException);
  });

  test('should create a subscription', async () => {
    const newSubscription = await SubscriptionService.createSubscription(
      new CreateSubscriptionDto(stage.context)
        .fake()
        .populate({ project_uuid, package_id: subscriptionPackage.id }),
      stage.context,
      null,
    );
    expect(newSubscription).toBeDefined();

    // Check if subscription saved to DB
    const subscription = await new Subscription({}, stage.context).populateById(
      newSubscription.id,
    );
    expect(subscription.exists()).toBeTruthy();
    expect(subscription.project_uuid).toEqual(project_uuid);
    expect(subscription.subscriberEmail).toEqual(
      newSubscription.subscriberEmail,
    );
    expect(subscription.stripeId).toEqual(newSubscription.stripeId);

    // Check if project has assigned active subscription
    const activeSubscription = await new Subscription(
      {},
      stage.context,
    ).getProjectSubscription(subscriptionPackage.id, project_uuid);
    expect(activeSubscription.exists()).toBeTruthy();
    expect(activeSubscription.project_uuid).toEqual(project_uuid);
    expect(activeSubscription.id).toEqual(subscription.id);

    // Check if project has received credits for new subscription
    const projectCredit = await new Credit({}, stage.context).populateByUUID(
      project_uuid,
    );

    expect(projectCredit.exists()).toBeTruthy();
    expect(projectCredit.balance).toBe(subscriptionPackage.creditAmount);
  });

  test('should not be able to create a subscription if already active', async () => {
    const createSubscription = async () => {
      await SubscriptionService.createSubscription(
        new CreateSubscriptionDto(stage.context)
          .fake()
          .populate({ project_uuid, package_id: subscriptionPackage.id }),
        stage.context,
        null,
      );
    };
    await expect(createSubscription).rejects.toThrowError(ScsCodeException);
  });

  test('should update a subscription', async () => {
    const activeSubscription = await new Subscription(
      {},
      stage.context,
    ).getActiveSubscription(project_uuid);
    expect(activeSubscription.exists()).toBeTruthy();
    expect(activeSubscription.project_uuid).toEqual(project_uuid);

    const subPackage = await new SubscriptionPackage(
      {},
      stage.context,
    ).populateById(activeSubscription.package_id);

    const expiresOn = new Date(activeSubscription.expiresOn);
    expiresOn.setDate(expiresOn.getDate() + 30); // Extend by 30 days

    const updatedSubscription = await SubscriptionService.updateSubscription(
      {
        updateSubscriptionDto: new UpdateSubscriptionDto({
          subscriptionStripeId: activeSubscription.stripeId,
          stripePackageId: subPackage.stripeId,
          expiresOn,
          status: SqlModelStatus.ACTIVE,
        }),
      },
      stage.context,
    );
    expect(updatedSubscription).toBeDefined();
    expect(updatedSubscription.expiresOn).toEqual(expiresOn);

    // Cancel a subscription
    const cancellationReason = 'too_good';
    const cancellationComment = 'too good for me';
    const canceledSubscription = await SubscriptionService.updateSubscription(
      {
        updateSubscriptionDto: new UpdateSubscriptionDto({
          subscriptionStripeId: activeSubscription.stripeId,
          stripePackageId: subPackage.stripeId,
          expiresOn,
          status: SqlModelStatus.INACTIVE,
          cancelDate: new Date(),
          cancellationReason,
          cancellationComment,
        }),
      },
      stage.context,
    );
    // expect(canceledSubscription.status).toBe(SqlModelStatus.INACTIVE);
    expect(canceledSubscription.cancellationReason).toBe(cancellationReason);
    expect(canceledSubscription.cancellationComment).toBe(cancellationComment);

    // activeSubscription = await new Subscription(
    //   {},
    //   stage.context,
    // ).getActiveSubscription(project_uuid);
    // expect(activeSubscription.exists()).toBeFalsy();

    // Set existing subscription to inactive to test credit amount
    await stage.db.paramExecute(
      `UPDATE \`${DbTables.SUBSCRIPTION}\`SET \`status\` = ${SqlModelStatus.INACTIVE} WHERE \`stripeId\` = '${activeSubscription.stripeId}';`,
    );
  });

  test('should not receive credits when renewing subscription', async () => {
    const newSubscription = await SubscriptionService.createSubscription(
      new CreateSubscriptionDto(stage.context)
        .fake()
        .populate({ project_uuid, package_id: subscriptionPackage.id }),
      stage.context,
      null,
    );
    expect(newSubscription).toBeDefined();

    // Check if subscription saved to DB
    const subscription = await new Subscription({}, stage.context).populateById(
      newSubscription.id,
    );
    expect(subscription.exists()).toBeTruthy();
    expect(subscription.project_uuid).toEqual(project_uuid);
    expect(subscription.subscriberEmail).toEqual(
      newSubscription.subscriberEmail,
    );
    expect(subscription.stripeId).toEqual(newSubscription.stripeId);

    // Check if project has received credits for new subscription
    const projectCredit = await new Credit({}, stage.context).populateByUUID(
      project_uuid,
    );

    expect(projectCredit.exists()).toBeTruthy();
    // Balance is same as before, not increased
    expect(projectCredit.balance).toBe(subscriptionPackage.creditAmount);
  });

  test('should be able to list subscriptions', async () => {
    const { items } = await SubscriptionService.listSubscriptions(
      {
        query: new SubscriptionsQueryFilter({ project_uuid }, stage.context),
      },
      stage.context,
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].package_id).toEqual(subscriptionPackage.id);
  });
});
