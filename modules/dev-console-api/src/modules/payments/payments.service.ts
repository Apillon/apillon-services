import { BadRequestErrorCode, CodeException, env } from '@apillon/lib';
import { Injectable, RawBodyRequest } from '@nestjs/common';
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
      ],
      mode: 'subscription',
      success_url: `https://apillon.io/?success=true`,
      cancel_url: `https://apillon.io/?canceled=true`,
      automatic_tax: { enabled: true },
    });
  }

  async onWebhookEvent(payload: any) {
    // Indicates successful payment and checkout completed
    if (payload.type !== 'checkout.session.completed') {
      return;
    }

    const sessionWithLineItems = await this.stripe.checkout.sessions.retrieve(
      payload.data.object.id,
      { expand: ['line_items'] },
    );
    const lineItems = sessionWithLineItems.line_items;
    /* TODO:
     * - Save payment, customer and product info to DB
     * - Send invoice email
     * - Spend money
     */
  }

  verifyWebhookSignature(rawRequest: Buffer, signature: string) {
    try {
      this.stripe.webhooks.constructEvent(
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
