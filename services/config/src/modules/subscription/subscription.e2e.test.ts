import { v4 as uuid } from 'uuid';
import { setupTest, Stage } from '../../../test/setup';
import { SubscriptionService } from './subscription.service';
import {
  CreateSubscriptionDto,
  SqlModelStatus,
  SubscriptionsQueryFilter,
} from '@apillon/lib';
import { SubscriptionPackage } from './models/subscription-package.model';
import { Subscription } from './models/subscription.model';
import { Credit } from '../credit/models/credit.model';
import { ScsCodeException, ScsValidationException } from '../../lib/exceptions';

describe('Subscriptions unit test', () => {
  let stage: Stage;

  const project_uuid = uuid();
  let subscriptionPackage: SubscriptionPackage;

  beforeAll(async () => {
    stage = await setupTest();

    subscriptionPackage = new SubscriptionPackage({}, stage.context)
      .fake()
      .populate({
        creditAmount: 2000,
      });

    await subscriptionPackage.insert();
  });

  it('should get all subscription packages', async () => {
    const packages = await SubscriptionService.getSubscriptionPackages(
      null,
      stage.context,
    );
    expect(packages?.length).toBe(1); // Created in beforeAll method
  });

  it('should throw when creating an invalid subscription', async () => {
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

  it('should create a subscription', async () => {
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

  it('should not be able to create a subscription if already active', async () => {
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

  it('should update a subscription', async () => {
    let activeSubscription = await new Subscription(
      {},
      stage.context,
    ).getActiveSubscription(project_uuid);
    expect(activeSubscription.exists()).toBeTruthy();
    expect(activeSubscription.project_uuid).toEqual(project_uuid);

    const expiresOn = new Date(activeSubscription.expiresOn);
    expiresOn.setDate(expiresOn.getDate() + 30); // Extend by 30 days

    const updatedSubscription = await SubscriptionService.updateSubscription(
      {
        subscriptionStripeId: activeSubscription.stripeId,
        data: { expiresOn },
      },
      stage.context,
    );
    expect(updatedSubscription).toBeDefined();
    expect(updatedSubscription.expiresOn).toEqual(expiresOn);

    // Cancel a subscription
    const canceledSubscription = await SubscriptionService.updateSubscription(
      {
        subscriptionStripeId: activeSubscription.stripeId,
        data: { status: SqlModelStatus.INACTIVE, cancelDate: new Date() },
      },
      stage.context,
    );
    expect(canceledSubscription.status).toBe(SqlModelStatus.INACTIVE);

    activeSubscription = await new Subscription(
      {},
      stage.context,
    ).getActiveSubscription(project_uuid);
    expect(activeSubscription.exists()).toBeFalsy();
  });

  it('should be able to list subscriptions', async () => {
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
