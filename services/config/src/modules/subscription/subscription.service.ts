import {
  AddCreditDto,
  CreateSubscriptionDto,
  Lmas,
  LogType,
  PoolConnection,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
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
import { InvoiceService } from '../invoice/invoice.service';

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
    connection?: PoolConnection,
  ): Promise<Subscription> {
    const conn = connection || (await context.mysql.start());

    try {
      await SubscriptionService.checkForActiveSubscription(
        createSubscriptionDto.project_uuid,
        context,
        conn,
      );
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
          sendAdminAlert: true,
          data: { package_id: createSubscriptionDto.package_id },
        });
      }

      const subscription = new Subscription(createSubscriptionDto, context);

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

      await SubscriptionService.giveCreditsForSubscription(context, {
        package_id: createSubscriptionDto.package_id,
        project_uuid: createSubscriptionDto.project_uuid,
        // Insert subscription here so referenceId can be filled in, but also pass previousSubscription check
        subscriptionId: async () =>
          (await subscription.insert(SerializeFor.INSERT_DB, conn)).id,
        creditAmount: subscriptionPackage.creditAmount,
      });

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
  ): Promise<Subscription> {
    const subscription = await new Subscription(
      { project_uuid },
      context,
    ).getActiveSubscription(project_uuid, conn);
    return subscription.serialize(SerializeFor.PROFILE) as Subscription;
  }

  static async hasProjectActiveRpcPlan(
    { project_uuid }: { project_uuid: string },
    context: ServiceContext,
  ): Promise<boolean> {
    return await new Subscription({ project_uuid }, context).hasActiveRpcPlan();
  }

  /**
   * Update a subscription by stripe ID with given data
   * @param {{ updateSubscriptionDto: UpdateSubscriptionDto }} { updateSubscriptionDto }
   * @param {ServiceContext} context
   * @returns {Promise<Subscription>}
   */
  static async updateSubscription(
    { updateSubscriptionDto }: { updateSubscriptionDto: UpdateSubscriptionDto },
    context: ServiceContext,
  ): Promise<Subscription> {
    const conn = await context.mysql.start();
    const subscriptionStripeId = updateSubscriptionDto.subscriptionStripeId;

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
          data: new UpdateSubscriptionDto(updateSubscriptionDto).serialize(
            SerializeFor.SERVICE,
          ),
        });
        throw await new ScsNotFoundException(
          ConfigErrorCode.SUBSCRIPTION_NOT_FOUND,
        ).writeToMonitor({
          context,
          data: { subscriptionStripeId },
          service: ServiceName.CONFIG,
          sendAdminAlert: true,
          logType: LogType.ERROR,
        });
      }

      const subscriptionPackage = await new SubscriptionPackage(
        {},
        context,
      ).populateByStripeId(updateSubscriptionDto.stripePackageId, conn);
      const package_id = subscriptionPackage?.id;

      if (!package_id) {
        throw await new ScsCodeException({
          status: 404,
          code: ConfigErrorCode.SUBSCRIPTION_PACKAGE_NOT_FOUND,
          sourceFunction: 'updateSubscription',
          sourceModule: ServiceName.CONFIG,
        }).writeToMonitor({
          context,
          sendAdminAlert: true,
          data: { stripePackageId: updateSubscriptionDto.stripePackageId },
        });
      }
      const previousExpiresOn = subscription.expiresOn;
      subscription.populate(updateSubscriptionDto);
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

      if (package_id !== subscription.package_id) {
        // If package has been upgraded or downgraded, create a new one and set current to inactive
        const newSubscription = new Subscription(
          subscription.serialize(SerializeFor.INSERT_DB),
          context,
        );
        newSubscription.package_id = package_id;

        subscription.status = SqlModelStatus.INACTIVE;

        if (package_id > subscription.package_id) {
          const previousPackage = await new SubscriptionPackage(
            {},
            context,
          ).populateById(subscription.package_id);
          // Subscription package upgraded, give additional credits from higher package
          await Promise.all([
            SubscriptionService.giveCreditsForSubscription(
              context,
              {
                package_id,
                project_uuid: newSubscription.project_uuid,
                subscriptionId: async () =>
                  (await newSubscription.insert(SerializeFor.INSERT_DB, conn))
                    .id,
                creditAmount:
                  subscriptionPackage.creditAmount -
                  previousPackage.creditAmount,
              },
              conn,
            ),
            await InvoiceService.createOnSubscriptionUpdate(
              context,
              subscription,
              updateSubscriptionDto,
              conn,
            ),
          ]);
        } else {
          // Only a downgrade, do not create invoice, just insert the new subscription
          await newSubscription.insert(SerializeFor.INSERT_DB, conn);
        }
      } else if (
        new Date(updateSubscriptionDto.expiresOn) > new Date(previousExpiresOn)
      ) {
        await InvoiceService.createOnSubscriptionUpdate(
          context,
          subscription,
          updateSubscriptionDto,
          conn,
        );
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

  /**
   * Get all active subscriptions
   * @param event
   * @param context
   * @returns
   */
  static async getProjectsWithActiveSubscription(
    event: { subscriptionPackageId?: number },
    context: ServiceContext,
  ) {
    return await new Subscription(
      {},
      context,
    ).getProjectsWithActiveSubscription(event.subscriptionPackageId);
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
    if (new Subscription(activeSubscription, context).exists()) {
      throw await new ScsCodeException({
        code: ConfigErrorCode.ACTIVE_SUBSCRIPTION_EXISTS,
        status: 400,
        errorCodes: ConfigErrorCode,
        sourceFunction: 'getSubscriptionPackageStripeId',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({ project_uuid });
    }
  }

  private static async giveCreditsForSubscription(
    context: ServiceContext,
    data: {
      package_id: number;
      project_uuid: string;
      subscriptionId: () => Promise<number>;
      creditAmount: number;
    },
    conn?: PoolConnection,
  ) {
    const previousSubscription = await new Subscription(
      {},
      context,
    ).getProjectSubscription(data.package_id, data.project_uuid, conn);

    // Resolve referenceId here so the subscription can be inserted after the object above is fetched from DB
    const referenceId = await data.subscriptionId();

    // If this is the first time subscribing to this package for this project
    // Give credits to the project based on the purchased package
    if (!previousSubscription?.exists()) {
      await CreditService.addCredit(
        {
          body: new AddCreditDto({
            project_uuid: data.project_uuid,
            amount: data.creditAmount,
            referenceTable: DbTables.SUBSCRIPTION,
            referenceId,
          }),
        },
        context,
        conn,
      );
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
  ): Promise<any[]> {
    return await new SubscriptionPackage({}, context).getAll();
  }
}
