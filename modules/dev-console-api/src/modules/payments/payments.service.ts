import {
  BadRequestErrorCode,
  CodeException,
  Scs,
  env,
  getEnumKey,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { PurchasePriceMap } from '../../config/types';

@Injectable()
export class PaymentsService {
  constructor(private stripe: Stripe) {}

  async generateStripePaymentSession(
    paymentSessionDto: PaymentSessionDto,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    const isCreditPurchase = paymentSessionDto.credits;

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      price: isCreditPurchase
        ? PurchasePriceMap.credits
        : PurchasePriceMap[paymentSessionDto.subscription_id],
      quantity: 1,
      adjustable_quantity: isCreditPurchase
        ? {
            enabled: true,
            minimum: 1,
          }
        : undefined,
    };
    return await this.stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: isCreditPurchase ? 'payment' : 'subscription',
      metadata: {
        project_uuid: paymentSessionDto.project_uuid,
        isCreditPurchase: `${isCreditPurchase}`,
      },
      // TODO
      success_url: `https://apillon.io/?success=true`,
      cancel_url: `https://apillon.io/?canceled=true`,
      automatic_tax: { enabled: true },
    });
  }

  async stripeWebhookEventHandler(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        // https://stripe.com/docs/api/checkout/sessions/object
        const session = event.data.object as any;
        if (session.payment_status !== 'paid') {
          return;
        }
        const project_uuid = session.metadata.project_uuid;
        const isCreditPurchase = session.metadata.isCreditPurchase === 'true';
        if (isCreditPurchase) {
          // TODO: handle credit purchase
          return;
        }
        const { line_items: lineItems } =
          await this.stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items'],
          });
        const subscriptionPackageId = +getEnumKey(
          PurchasePriceMap,
          lineItems.data[0].price.id,
        );

        await new Scs().createSubscription(subscriptionPackageId, project_uuid);
        /* TODO:
         * - Save payment, customer and product info to DB
         * - Send invoice email
         * - Spend money
         */

        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        // const session = event.data.object;
        // TODO
        break;
      }

      case 'checkout.session.async_payment_failed': {
        // const session = event.data.object;
        // TODO
        break;
      }
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
        code: BadRequestErrorCode.BAD_REQUEST,
        errorCodes: BadRequestErrorCode,
        errorMessage: 'Invalid webhook signature',
      });
    }
  }
}
