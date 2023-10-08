import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { CodeException, env } from '@apillon/lib';
import { BadRequestErrorCode } from '../../config/types';

@Injectable()
export class StripeService {
  constructor(private stripe: Stripe) {}

  generateStripeCreditPaymentSession(
    paymentSessionDto: PaymentSessionDto,
    stripeId: string,
  ) {
    return this.genericStripeSession(stripeId, 'payment', {
      project_uuid: paymentSessionDto.project_uuid,
      package_id: +paymentSessionDto.package_id,
      isCreditPurchase: `${true}`,
    });
  }

  generateStripeSubscriptionPaymentSession(
    paymentSessionDto: PaymentSessionDto,
    stripeId: string,
  ) {
    return this.genericStripeSession(stripeId, 'subscription', {
      project_uuid: paymentSessionDto.project_uuid,
      package_id: +paymentSessionDto.package_id,
      isCreditPurchase: `${false}`,
    });
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

  combinePaymentData(paymentData: any) {
    const { project_uuid, package_id } = paymentData.metadata;

    const isCreditPurchase = paymentData.metadata.isCreditPurchase === 'true';

    return {
      package_id,
      isCreditPurchase,
      project_uuid,
      subtotalAmount: paymentData.amount_subtotal / 100,
      totalAmount: paymentData.amount_total / 100,
      clientName: paymentData.customer_details.name,
      clientEmail: paymentData.customer_details.email,
      subscriberEmail: paymentData.customer_details.email,
    };
  }

  private genericStripeSession(
    stripeId: string,
    mode: Stripe.Checkout.SessionCreateParams.Mode,
    metadata: Stripe.MetadataParam,
  ) {
    return this.stripe.checkout.sessions.create({
      line_items: [
        {
          price: stripeId,
          quantity: 1,
        },
      ],
      mode,
      metadata,
      // TODO
      success_url: `https://apillon.io/?success=true`,
      cancel_url: `https://apillon.io/?canceled=true`,
      automatic_tax: { enabled: true },
    });
  }
}
