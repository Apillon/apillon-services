import {
  AddCreditDto,
  CreateSubscriptionDto,
  Lmas,
  LogType,
  PoolConnection,
  SerializeFor,
  ServiceName,
  SubscriptionPackages,
  SubscriptionsQueryFilter,
  getEnumKey,
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
import { CreditService } from '../credit/credit.service';

export class SubscriptionService {
  /**
   * Create a subscription for a project
   * @param {{ createSubscriptionDto: CreateSubscriptionDto }} createSubscriptionDto - subset DTO containing the subscription data
   * @param {ServiceContext} context
   * @returns {Promise<Subscription>}
   */
  static async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
    context: ServiceContext,
    conn: PoolConnection,
  ): Promise<Subscription> {
    const subscriptionPackage =
      await SubscriptionService.getSubscriptionPackageById(
        { id: createSubscriptionDto.package_id },
        context,
      );

    if (!subscriptionPackage?.exists()) {
      throw await new ScsCodeException({
        status: 404,
        code: ConfigErrorCode.SUBSCRIPTION_PACKAGE_NOT_FOUND,
        sourceFunction: 'createSubscription',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({
        context,
        data: { package_id: createSubscriptionDto.package_id },
      });
    }

    let subscription = new Subscription(createSubscriptionDto, context);

    try {
      await subscription.validate();
    } catch (err) {
      await subscription.handle(err);

      if (!subscription.isValid()) {
        await new Lmas().sendAdminAlert(
          `Invalid subscription received: ${createSubscriptionDto.package_id} for project ${createSubscriptionDto.project_uuid}
          and customer ${createSubscriptionDto.subscriberEmail}. Error: ${err.message}`,
          ServiceName.CONFIG,
          LogType.ALERT,
        );
        throw new ScsValidationException(subscription);
      }
    }

    try {
      subscription = await subscription.insert(SerializeFor.INSERT_DB, conn);

      const previousSubscription = await new Subscription(
        {},
        context,
      ).getProjectSubscription(
        createSubscriptionDto.package_id,
        createSubscriptionDto.project_uuid,
      );
      if (!previousSubscription?.exists()) {
        await CreditService.addCredit(
          new AddCreditDto({
            project_uuid: createSubscriptionDto.project_uuid,
            amount: subscriptionPackage.creditAmount,
            referenceTable: DbTables.SUBSCRIPTION,
            referenceId: subscription.id,
          }),
          context,
          conn,
        );
      }

      await new Lmas().sendAdminAlert(
        `New subscription for package ${getEnumKey(
          SubscriptionPackages,
          subscription.package_id,
        )} created!`,
        ServiceName.CONFIG,
        LogType.MSG,
      );

      return subscription.serialize(SerializeFor.SERVICE) as Subscription;
    } catch (err) {
      if (err instanceof ScsCodeException) {
        throw err;
      } else {
        throw await new ScsCodeException({
          code: ConfigErrorCode.ERROR_CREATING_SUBSCRIPTION,
          status: 500,
          context,
          errorMessage: err?.message,
          sourceFunction: 'createSubscription()',
          sourceModule: 'SubscriptionService',
        }).writeToMonitor({
          project_uuid: createSubscriptionDto.project_uuid,
          data: {
            ...new CreateSubscriptionDto(createSubscriptionDto).serialize(),
          },
        });
      }
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
      throw await new ScsCodeException({
        code: ConfigErrorCode.ACTIVE_SUBSCRIPTION_EXISTS,
        status: 400,
        errorCodes: ConfigErrorCode,
        sourceFunction: 'getSubscriptionPackageStripeId',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({ project_uuid });
    }

    const subscriptionPackage =
      await SubscriptionService.getSubscriptionPackageById(
        { id: package_id },
        context,
      );

    if (!subscriptionPackage?.stripeId) {
      throw await new ScsCodeException({
        code: ConfigErrorCode.STRIPE_ID_NOT_VALID,
        status: 500,
        errorCodes: ConfigErrorCode,
        sourceFunction: 'getSubscriptionPackageStripeId',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({
        project_uuid,
        data: {
          subscriptionPackage: new SubscriptionPackage(
            subscriptionPackage,
          ).serialize(),
        },
      });
    }

    return subscriptionPackage.stripeId;
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
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `Subscription for stripe ID ${subscriptionStripeId} not found in database!`,
        location: 'SubscriptionService.updateSubscription',
        service: ServiceName.CONFIG,
        data,
      });
      throw new ScsNotFoundException(ConfigErrorCode.SUBSCRIPTION_NOT_FOUND);
    }

    subscription.populate(data);
    await subscription.update();

    return subscription.serialize(SerializeFor.SERVICE) as Subscription;
  }

  /**
   * Get all subscriptions, existing or for a single project
   * @param {event: {query: SubscriptionsQueryFilter}} - Query filter for listing subscriptions
   */
  static async listSubscriptions(
    event: { query: SubscriptionsQueryFilter },
    context: ServiceContext,
  ) {
    return await new Subscription({
      project_uuid: event.query.project_uuid,
    }).getList(event.query, context);
  }
}
