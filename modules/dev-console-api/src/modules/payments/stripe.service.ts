import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { CodeException, env } from '@apillon/lib';
import { BadRequestErrorCode } from '../../config/types';

@Injectable()
export class StripeService {
  constructor(private stripe: Stripe) {}

  /**
   * Verifies stripe webhook signature and returns an event object if valid
   * @param {Buffer} rawRequest
   * @param {string} signature
   * @returns {Stripe.Event}
   */
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

  /**
   * Constructs a generic stripe payment session from the given data
   * @param {string} stripeId - Stripe price ID for the package to be purchased
   * @param {PaymentSessionDto} paymentSessionDto - DTO containing all required payment metadata
   * @param {Stripe.Checkout.SessionCreateParams.Mode} mode - single payment or subscription
   * @returns {Promise<Stripe.Checkout.Session>}
   */
  generateStripePaymentSession(
    stripeId: string,
    paymentSessionDto: PaymentSessionDto,
    mode: Stripe.Checkout.SessionCreateParams.Mode,
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      line_items: [
        {
          price: stripeId,
          quantity: 1,
        },
      ],
      mode,
      metadata: {
        project_uuid: paymentSessionDto.project_uuid,
        package_id: +paymentSessionDto.package_id,
        isCreditPurchase: `${mode === 'payment'}`,
      },
      success_url: paymentSessionDto.returnUrl,
      cancel_url: paymentSessionDto.returnUrl,
      automatic_tax: { enabled: true },
    });
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
}
