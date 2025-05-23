import {
  CodeException,
  DefaultUserRole,
  DwellirSubscription,
  ForbiddenErrorCodes,
  InfrastructureMicroservice,
  Lmas,
  LogType,
  PricelistQueryFilter,
  QuotaCode,
  QuotaOverrideDto,
  Scs,
  ServiceName,
  SubscriptionPackageId,
  UpdateSubscriptionDto,
  env,
  writeLog,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { Project } from '../project/models/project.model';
import { DevConsoleApiContext } from '../../context';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentsService {
  constructor(
    private stripe: Stripe,
    private stripeService: StripeService,
  ) {}

  /**
   * Creates a stripe payment session for purchasing a credit package
   * @param {DevConsoleApiContext} context
   * @param {PaymentSessionDto} paymentSessionDto - containing the credit package data and paymentmetadata
   * @returns {Promise<Stripe.Checkout.Session>}
   */
  async createStripeCreditPaymentSession(
    context: DevConsoleApiContext,
    paymentSessionDto: PaymentSessionDto,
  ): Promise<Stripe.Checkout.Session> {
    await this.checkProjectExists(context, paymentSessionDto.project_uuid);

    const { data: stripeId } = await new Scs(context).getCreditPackageStripeId(
      +paymentSessionDto.package_id,
      paymentSessionDto.project_uuid,
    );

    return await this.stripeService.generateStripePaymentSession(
      stripeId,
      context.user.email,
      paymentSessionDto,
      'payment',
    );
  }

  /**
   * Creates a stripe payment session for purchasing a subscription package
   * @param {DevConsoleApiContext} context
   * @param {PaymentSessionDto} paymentSessionDto - containing the subscription package data and metadata
   * @returns {Promise<Stripe.Checkout.Session>}
   */
  async createStripeSubscriptionPaymentSession(
    context: DevConsoleApiContext,
    paymentSessionDto: PaymentSessionDto,
  ): Promise<Stripe.Checkout.Session> {
    await this.checkProjectExists(context, paymentSessionDto.project_uuid);

    const { data: stripeId } = await new Scs(
      context,
    ).getSubscriptionPackageStripeId(
      +paymentSessionDto.package_id,
      paymentSessionDto.project_uuid,
    );

    return await this.stripeService.generateStripePaymentSession(
      stripeId,
      context.user.email,
      paymentSessionDto,
      'subscription',
      context.user.user_uuid,
    );
  }

  /**
   * Handler function for webhooks sent from stripe, when user subscribes, changes subscription or purchases credits
   * @param {Stripe.Event} event - verified event sent by Stripe
   */
  async stripeWebhookEventHandler(event: Stripe.Event) {
    // https://stripe.com/docs/api/checkout/sessions/object
    const payment = event.data.object as any;
    switch (event.type) {
      case 'checkout.session.completed': {
        if (
          payment.payment_status !== 'paid' ||
          payment.metadata.environment !== env.APP_ENV
        ) {
          // In case payment session was canceled/exited
          // or the session is in a different environment
          return;
        }

        const paymentData = this.stripeService.combinePaymentData(payment);
        if (paymentData.isCreditPurchase) {
          // Get purchased items from Stripe API
          const sessionWithLineItems =
            await this.stripe.checkout.sessions.retrieve(payment.id, {
              expand: ['line_items'],
            });
          const creditPurchase = sessionWithLineItems.line_items.data[0];

          await new Scs().handlePaymentWebhookData({
            ...paymentData,
            currency: creditPurchase.currency,
            invoiceStripeId: creditPurchase.price.id,
          });
        } else {
          // Call Stripe API to fetch subscription data
          const subscription = await this.stripe.subscriptions.retrieve(
            payment.subscription,
          );

          await new Scs().handlePaymentWebhookData({
            ...paymentData,
            expiresOn: new Date(subscription.current_period_end * 1000),
            stripeId: subscription.id,
            currency: payment.currency,
            invoiceStripeId: payment.invoice,
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const scs = new Scs();
        if (event.data?.previous_attributes?.status === 'incomplete') {
          return; // If update is only for a new subscription
        }
        if (
          payment.canceled_at &&
          Number(payment.plan.id) === SubscriptionPackageId.RPC_PLAN
        ) {
          const user_uuid =
            event.data?.previous_attributes?.metadata?.user_uuid;
          if (user_uuid) {
            await new InfrastructureMicroservice().changeDwellirSubscription(
              user_uuid,
              DwellirSubscription.FREE,
            );

            await scs.deleteOverride(
              new QuotaOverrideDto().populate({
                object_uuid: user_uuid,
                quota_id: QuotaCode.MAX_RPC_KEYS,
              }),
            );
          } else {
            await new Lmas().writeLog({
              sendAdminAlert: true,
              logType: LogType.ERROR,
              message: `User UUID not found in metadata`,
              service: ServiceName.DEV_CONSOLE,
              location: 'PaymentsService.stripeWebhookEventHandler',
              data: { metadata: event.data?.previous_attributes?.metadata },
            });
          }
        }

        // In case subscription is renewed or canceled
        await scs.updateSubscription(
          new UpdateSubscriptionDto({
            subscriptionStripeId: payment.id,
            cancelDate: payment.canceled_at
              ? new Date(payment.canceled_at * 1000)
              : null,
            // If status is no longer active, set subscription as expired
            expiresOn:
              event.data?.previous_attributes?.status === 'active'
                ? new Date()
                : new Date(payment.current_period_end * 1000),
            cancellationReason: payment.cancellation_details?.feedback,
            cancellationComment: payment.cancellation_details?.comment,
            stripePackageId: payment.plan.id,
            invoiceStripeId: payment.latest_invoice,
            amount: payment.plan?.amount / 100,
          }),
        );
        break;
      }
    }
  }

  async checkProjectExists(
    context: DevConsoleApiContext,
    project_uuid: string,
  ) {
    await new Project({}, context).populateByUUIDOrThrow(project_uuid);

    if (
      !context.hasRoleOnProject([DefaultUserRole.PROJECT_OWNER], project_uuid)
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions to perform this action',
      });
    }
  }

  /**
   * Get all active subscription packages from the database, assign prices through Stripe API
   * @param {DevConsoleApiContext} context
   */
  async getSubscriptionPackages(context: DevConsoleApiContext) {
    const { data: subscriptionPackages } = await new Scs(
      context,
    ).getSubscriptionPackages();

    return await this.assignPrices(subscriptionPackages);
  }

  /**
   * Get all active credit packages from the database, assign prices through Stripe API
   * @param {DevConsoleApiContext} context
   */
  async getCreditPackages(context: DevConsoleApiContext) {
    const { data: creditPackages } = await new Scs(context).getCreditPackages();

    return await this.assignPrices(creditPackages);
  }

  private async assignPrices(items: any[]) {
    for (const item of items) {
      if (item.stripeId) {
        const price = await this.stripe.prices.retrieve(item.stripeId);
        item.price = price.unit_amount / 100;
      }
      delete item.stripeId;
    }
    return items;
  }

  /**
   * Get all active products with their respective prices for displaying on the UI
   * @param {DevConsoleApiContext} context
   * @param {PricelistQueryFilter} query - Filter by name, service or category
   * @returns {Product[]}
   */
  async getProductPricelist(
    context: DevConsoleApiContext,
    query: PricelistQueryFilter,
  ) {
    return (await new Scs(context).getProductPricelist(query)).data;
  }

  /**
   * Get a product and its price by product_id
   * @param {DevConsoleApiContext} context
   * @param {number} product_id
   * @returns {Product}
   */
  async getProductPrice(context: DevConsoleApiContext, product_id: number) {
    return (await new Scs(context).getProductPrice(product_id)).data;
  }
}
