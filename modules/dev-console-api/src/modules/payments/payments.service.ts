import { BadRequestErrorCode, CodeException, env } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(private stripe: Stripe) {}

  async generatePaymentSession(): Promise<
    Stripe.Response<Stripe.Checkout.Session>
  > {
    return await this.stripe.checkout.sessions.create({
      line_items: [
        {
          price: 'price_1NmcbNGlTglE98hYRiHlCOG7',
          quantity: 1,
        },
        {
          price: 'price_1Nmxj3GlTglE98hYsNt7hm0V',
          quantity: 1,
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
          },
        },
      ],
      mode: 'subscription',
      success_url: `https://apillon.io/?success=true`,
      cancel_url: `https://apillon.io/?canceled=true`,
      automatic_tax: { enabled: true },
    });
  }

  async onWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        if (session.payment_status !== 'paid') {
          return;
        }
        // const sessionWithLineItems =
        //   await this.stripe.checkout.sessions.retrieve(
        //     event.data.object['id'],
        //     { expand: ['line_items'] },
        //   );
        // const lineItems = sessionWithLineItems.line_items;
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
