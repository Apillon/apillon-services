import {
  CreateSubscriptionDto,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
} from '@apillon/lib';
import { Subscription } from './models/subscription.model';
import { ServiceContext } from '@apillon/service-lib';
import { SubscriptionPackage } from './models/subscription-package.model';
import {
  ScsNotFoundException,
  ScsValidationException,
} from '../../lib/exceptions';
import { ConfigErrorCode } from '../../config/types';

export class SubscriptionService {
  /**
   * Create a subscription for a project
   * @param {{ createSubscriptionDto: CreateSubscriptionDto }} createSubscriptionDto - subset DTO containing the subscription data
   * @param {ServiceContext} context
   * @returns {Promise<Subscription>}
   */
  static async createSubscription(
    { createSubscriptionDto }: { createSubscriptionDto: CreateSubscriptionDto },
    context: ServiceContext,
  ): Promise<Subscription> {
    const subscription = new Subscription(createSubscriptionDto, context);

    try {
      await subscription.validate();
    } catch (err) {
      await subscription.handle(err);

      if (!subscription.isValid()) {
        await new Lmas().sendAdminAlert(
          `Invalid subscription received: ${createSubscriptionDto.package_id} for project ${createSubscriptionDto.project_uuid}
          and customer ${createSubscriptionDto.subscriberEmail}. Error: ${err.message}`,
          ServiceName.SCS,
          LogType.ALERT,
        );
        throw new ScsValidationException(subscription);
      }
    }

    return (await subscription.insert()).serialize(
      SerializeFor.SERVICE,
    ) as Subscription;
  }

  static async getSubscriptionPackageById(
    { id }: { id: number },
    context: ServiceContext,
  ): Promise<SubscriptionPackage> {
    return await new SubscriptionPackage({}, context).populateById(id);
  }

  static async projectHasActiveSubscription(
    { project_uuid }: { project_uuid: string },
    context: ServiceContext,
  ): Promise<boolean> {
    const subscription = await new Subscription(
      { project_uuid },
      context,
    ).getActiveSubscription();
    return subscription.exists();
  }

  /**
   * Update a subscription by stripe ID with given data
   * @param {{ subscriptionStripeId: string; data: any }} { subscriptionStripeId, data }
   * @param {ServiceContext} context
   * @returns {Promise<Subscription>}
   */
  static async updateSubscription(
    { subscriptionStripeId, data }: { subscriptionStripeId: string; data: any },
    context: ServiceContext,
  ): Promise<Subscription> {
    const subscription = await new Subscription(
      { subscriptionStripeId },
      context,
    ).populateByStripeId(subscriptionStripeId);

    if (!subscription.exists()) {
      throw new ScsNotFoundException(ConfigErrorCode.SUBSCRIPTION_NOT_FOUND);
    }

    subscription.populate(data);
    return await subscription.update();
  }
}
