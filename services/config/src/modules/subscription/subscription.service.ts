import {
  CreateInvoiceDto,
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
  ScsCodeException,
  ScsNotFoundException,
  ScsValidationException,
} from '../../lib/exceptions';
import { ConfigErrorCode, DbTables } from '../../config/types';
import { Invoice } from './models/invoice.model';

export class SubscriptionService {
  /**
   * Create a subscription for a project
   * @param {{ createSubscriptionDto: CreateSubscriptionDto }} createSubscriptionDto - subset DTO containing the subscription data
   * @param {{ createInvoiceDto: CreateInvoiceDto }} createInvoiceDto - DTO for creating an invoice for the subscription
   * @param {ServiceContext} context
   * @returns {Promise<Subscription>}
   */
  static async createSubscription(
    {
      createSubscriptionDto,
      createInvoiceDto,
    }: {
      createSubscriptionDto: CreateSubscriptionDto;
      createInvoiceDto: CreateInvoiceDto;
    },
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

    const conn = await context.mysql.start();
    try {
      const dbSubscription = await subscription.insert(
        SerializeFor.INSERT_DB,
        conn,
      );

      // Create an invoice after subscription has been stored
      await new Invoice(
        {
          ...createInvoiceDto,
          referenceTable: DbTables.SUBSCRIPTION,
          referenceId: dbSubscription.id,
        },
        context,
      ).insert(SerializeFor.INSERT_DB, conn);
      await context.mysql.commit(conn);
      return dbSubscription.serialize(SerializeFor.SERVICE) as Subscription;
    } catch {
      await context.mysql.rollback(conn);
      // TODO: handle error
    }
  }

  /**
   * Checks if project has active subscription, if not returns stripe API ID for the subscription package
   * Used to return the stripe API ID for generating a payment URL through the Stripe SDK
   * @param {{ package_id: number; project_uuid: string }} { package_id, project_uuid }
   * @param {ServiceContext} context
   * @returns {Promise<string>}
   */
  static async getSubscriptionPackageStripeId(
    { package_id, project_uuid }: { package_id: number; project_uuid: string },
    context: ServiceContext,
  ): Promise<string> {
    const hasActiveSubscription =
      await SubscriptionService.projectHasActiveSubscription(
        { project_uuid },
        context,
      );

    if (hasActiveSubscription) {
      throw new ScsCodeException({
        code: ConfigErrorCode.ACTIVE_SUBSCRIPTION_EXISTS,
        status: 400,
        errorCodes: ConfigErrorCode,
        sourceFunction: 'getSubscriptionPackageStripeId',
        sourceModule: ServiceName.SCS,
      });
    }

    const subscriptionPackage =
      await SubscriptionService.getSubscriptionPackageById(
        { id: package_id },
        context,
      );

    if (!subscriptionPackage.stripeApiId) {
      throw new ScsCodeException({
        code: ConfigErrorCode.STRIPE_ID_NOT_VALID,
        status: 422,
        errorCodes: ConfigErrorCode,
        sourceFunction: 'getSubscriptionPackageStripeId',
        sourceModule: ServiceName.SCS,
      });
    }

    return subscriptionPackage.stripeApiId;
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
