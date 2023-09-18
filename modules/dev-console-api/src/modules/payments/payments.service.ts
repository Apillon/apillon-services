import {
  AppEnvironment,
  CodeException,
  CreateSubscriptionDto,
  Scs,
  env,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { BadRequestErrorCode, ValidatorErrorCode } from '../../config/types';

@Injectable()
export class PaymentsService {
  constructor(private stripe: Stripe) {}

  async createStripePaymentSession(
    paymentSessionDto: PaymentSessionDto,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    const { data } = await new Scs().getSubscriptionPackageById(
      +paymentSessionDto.subscription_id,
    );
    const stripeApiId =
      env.APP_ENV == AppEnvironment.PROD
        ? data.stripeApiId
        : data.stripeApiIdTest;
    if (!stripeApiId) {
      throw new CodeException({
        code: ValidatorErrorCode.STRIPE_ID_NOT_VALID,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errorCodes: ValidatorErrorCode,
      });
    }
    const { data: hasActiveSubscription } =
      await new Scs().projectHasActiveSubscription(
        paymentSessionDto.project_uuid,
      );

    if (hasActiveSubscription) {
      throw new CodeException({
        code: BadRequestErrorCode.ACTIVE_SUBSCRIPTION_EXISTS,
        status: HttpStatus.BAD_REQUEST,
        errorCodes: BadRequestErrorCode,
      });
    }
    return await this.generateStripePaymentSession(
      paymentSessionDto,
      stripeApiId,
    );
  }
  async stripeWebhookEventHandler(event: Stripe.Event) {
    switch (event.type) {
      // customer.subscription.updated
      case 'checkout.session.completed': {
        // https://stripe.com/docs/api/checkout/sessions/object
        const session = event.data.object as any;
        if (session.payment_status !== 'paid') {
          return;
        }
        const { project_uuid, package_id } = session.metadata;
        const isCreditPurchase = session.metadata.isCreditPurchase === 'true';
        if (isCreditPurchase) {
          // TODO: handle credit purchase
          return;
        }
        const subscription = await this.stripe.subscriptions.retrieve(
          session.subscription,
        );

        await new Scs().createSubscription(
          new CreateSubscriptionDto({
            project_uuid,
            package_id,
            expiresOn: new Date(subscription.current_period_end * 1000),
            subscriberEmail: session.customer_details.email,
          }),
        );
        /* TODO:
         * - Save payment, customer and product info to DB
         * - Send invoice email
         * - Spend money
         */

        break;
      }
      case 'customer.subscription.updated':
        break;
      case 'payout.canceled':
        break;
    }
  }

  getStripeEventFromSignature(
    rawRequest: Buffer,
    signature: string,
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        rawRequest,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      throw new CodeException({
        status: 400,
        code: BadRequestErrorCode.INVALID_WEBHOOK_SIGNATURE,
        errorCodes: BadRequestErrorCode,
        errorMessage: 'Invalid webhook signature',
      });
    }
  }

  generateStripePaymentSession(
    paymentSessionDto: PaymentSessionDto,
    stripeApiId: string,
  ) {
    const isCreditPurchase = paymentSessionDto.credits;
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      price: stripeApiId,
      quantity: 1,
      adjustable_quantity: isCreditPurchase
        ? {
            enabled: true,
            minimum: 1,
          }
        : undefined,
    };
    return this.stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: isCreditPurchase ? 'payment' : 'subscription',
      metadata: {
        project_uuid: paymentSessionDto.project_uuid,
        package_id: paymentSessionDto.subscription_id,
        isCreditPurchase: `${isCreditPurchase}`,
      },
      // TODO
      success_url: `https://apillon.io/?success=true`,
      cancel_url: `https://apillon.io/?canceled=true`,
      automatic_tax: { enabled: true },
    });
  }
}
