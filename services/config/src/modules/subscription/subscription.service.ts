import {
  AddCreditDto,
  CreateSubscriptionDto,
  Lmas,
  LogType,
  PoolConnection,
  SerializeFor,
  ServiceName,
  SubscriptionsQueryFilter,
  UpdateSubscriptionDto,
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
    connection: PoolConnection,
  ): Promise<Subscription> {
    const conn = connection || (await context.mysql.start());

    await SubscriptionService.checkForActiveSubscription(
      createSubscriptionDto.project_uuid,
      context,
      conn,
    );
    try {
      const subscriptionPackage = await new SubscriptionPackage(
        {},
        context,
      ).populateById(createSubscriptionDto.package_id, conn);

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

      const previousSubscription = await new Subscription(
        {},
        context,
      ).getProjectSubscription(
        createSubscriptionDto.package_id,
        createSubscriptionDto.project_uuid,
        conn,
      );
      // Insert subscription here so it is not included in getProjectSubscription call
      subscription = await subscription.insert(SerializeFor.INSERT_DB, conn);

      // If this is the first time subscribing to this package for this project
      // Give credits to the project based on the purchased package
      if (!previousSubscription?.exists()) {
        await CreditService.addCredit(
          {
            body: new AddCreditDto({
              project_uuid: createSubscriptionDto.project_uuid,
              amount: subscriptionPackage.creditAmount,
              referenceTable: DbTables.SUBSCRIPTION,
              referenceId: subscription.id,
            }),
          },
          context,
          conn,
        );
      }

      await new Lmas().writeLog({
        context,
        logType: LogType.INFO,
        message: `New subscription for package ${subscriptionPackage.name} created!`,
        location: 'SCS/SubscriptionService/createSubscription',
        project_uuid: createSubscriptionDto.project_uuid,
        service: ServiceName.CONFIG,
      });
      if (!connection) {
        await context.mysql.commit(conn);
      }
      return subscription.serialize(SerializeFor.SERVICE) as Subscription;
    } catch (err) {
      if (!connection) {
        await context.mysql.rollback(conn);
      }
      if (
        err instanceof ScsCodeException ||
        err instanceof ScsValidationException
      ) {
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
          sendAdminAlert: true,
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
    await SubscriptionService.checkForActiveSubscription(project_uuid, context);

    const subscriptionPackage = await new SubscriptionPackage(
      {},
      context,
    ).populateById(package_id);

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
          package_id,
          subscriptionPackage: new SubscriptionPackage(
            subscriptionPackage,
          ).serialize(),
        },
      });
    }

    return subscriptionPackage.stripeId;
  }

  static async getProjectActiveSubscription(
    { project_uuid }: { project_uuid: string },
    context: ServiceContext,
    conn?: PoolConnection,
  ) {
    return await new Subscription(
      { project_uuid },
      context,
    ).getActiveSubscription(project_uuid, conn);
  }

  /**
   * Update a subscription by stripe ID with given data
   * @param {{ subscriptionStripeId: string; data: UpdateSubscriptionDto }} { subscriptionStripeId, data }
   * @param {ServiceContext} context
   * @returns {Promise<Subscription>}
   */
  static async updateSubscription(
    {
      subscriptionStripeId,
      data,
    }: { subscriptionStripeId: string; data: UpdateSubscriptionDto },
    context: ServiceContext,
  ): Promise<Subscription> {
    const conn = await context.mysql.start();

    try {
      const subscription = await new Subscription(
        { subscriptionStripeId },
        context,
      ).populateByStripeId(subscriptionStripeId, conn);

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

      try {
        await subscription.validate();
      } catch (err) {
        await subscription.handle(err);

        if (!subscription.isValid()) {
          await new Lmas().sendAdminAlert(
            `Invalid subscription data for update: package ID ${subscription.package_id} for project ${subscription.project_uuid}`,
            ServiceName.CONFIG,
            LogType.ALERT,
          );
          throw new ScsValidationException(subscription);
        }
      }

      await subscription.update(SerializeFor.UPDATE_DB, conn);
      await context.mysql.commit(conn);

      return subscription.serialize(SerializeFor.SERVICE) as Subscription;
    } catch (err) {
      await context.mysql.rollback(conn);
      if (
        err instanceof ScsCodeException ||
        err instanceof ScsValidationException
      ) {
        throw err;
      } else {
        throw await new ScsCodeException({
          code: ConfigErrorCode.ERROR_UPDATING_SUBSCRIPTION,
          status: 500,
          context,
          errorMessage: err?.message,
          sourceFunction: 'updateSubscription()',
          sourceModule: 'SubscriptionService',
        }).writeToMonitor({
          context,
          data: { subscriptionStripeId },
          sendAdminAlert: true,
        });
      }
    }
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

  private static async checkForActiveSubscription(
    project_uuid: string,
    context: ServiceContext,
    conn?: PoolConnection,
  ) {
    const activeSubscription =
      await SubscriptionService.getProjectActiveSubscription(
        { project_uuid },
        context,
        conn,
      );

    if (activeSubscription?.exists()) {
      throw await new ScsCodeException({
        code: ConfigErrorCode.ACTIVE_SUBSCRIPTION_EXISTS,
        status: 400,
        errorCodes: ConfigErrorCode,
        sourceFunction: 'getSubscriptionPackageStripeId',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({ project_uuid });
    }
  }

  /**
   * Returns all active subscription packages
   * @param {ServiceContext} context
   * @returns {Promise<string>}
   */
  static async getSubscriptionPackages(
    event: any,
    context: ServiceContext,
  ): Promise<string> {
    return await new SubscriptionPackage({}, context).getAll();
  }
}
