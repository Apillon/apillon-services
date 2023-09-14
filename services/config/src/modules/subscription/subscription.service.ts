import {
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  SubscriptionPackage,
} from '@apillon/lib';
import { Subscription } from './models/subscription.model';
import { ServiceContext } from '@apillon/service-lib';

export class SubscriptionService {
  /**
   * Create a subscription for a project
   * @param {{ subscriptionId: SubscriptionPackage; project_uuid: string }} {
        subscriptionId,
        project_uuid,
      }
   * @param {ServiceContext} context
   * @returns {Promise<Subscription>}
   */
  static async createSubscription(
    {
      subscriptionId,
      project_uuid,
    }: {
      subscriptionId: SubscriptionPackage;
      project_uuid: string;
    },
    context: ServiceContext,
  ): Promise<Subscription> {
    const expiresOn = new Date();
    // 1 month from now
    expiresOn.setMonth(expiresOn.getMonth() + 1);

    const subscription = new Subscription(
      {
        package_id: subscriptionId,
        project_uuid,
        expiresOn,
      },
      context,
    );

    try {
      await subscription.validate();
    } catch (err) {
      await subscription.handle(err);

      if (!subscription.isValid()) {
        await new Lmas().sendAdminAlert(
          `Invalid subscription received: ${subscriptionId} for project ${project_uuid}. Error: ${err.message}`,
          ServiceName.SCS,
          LogType.ALERT,
        );
        return;
      }
    }

    return (await subscription.insert()).serialize(
      SerializeFor.SERVICE,
    ) as Subscription;
  }
}
