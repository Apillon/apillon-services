import { env } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  async generatePaymentSession(): Promise<
    Stripe.Response<Stripe.Checkout.Session>
  > {
    const stripe = new Stripe(env.STRIPE_SECRET_TEST, {
      apiVersion: '2023-08-16',
    });

    return await stripe.checkout.sessions.create({
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
