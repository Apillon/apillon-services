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
}
