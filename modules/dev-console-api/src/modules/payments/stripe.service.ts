import { HttpStatus, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { CodeException, env } from '@apillon/lib';
import {
  BadRequestErrorCode,
  ResourceNotFoundErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';

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
        status: HttpStatus.BAD_REQUEST,
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
  async generateStripePaymentSession(
    stripeId: string,
    customer_email: string,
    paymentSessionDto: PaymentSessionDto,
    mode: Stripe.Checkout.SessionCreateParams.Mode,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    return await this.stripe.checkout.sessions.create({
      line_items: [
        {
          price: stripeId,
          quantity: 1,
        },
      ],
      mode,
      customer_email,
      metadata: {
        project_uuid: paymentSessionDto.project_uuid,
        package_id: +paymentSessionDto.package_id,
        isCreditPurchase: `${mode === 'payment'}`,
        environment: env.APP_ENV,
      },
      success_url: paymentSessionDto.returnUrl,
      cancel_url: paymentSessionDto.returnUrl,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    });
  }

  /**
   * Generates a customer portal session for the user by their email
   * Session is used to edit, cancel or renew subscriptions
   * @param {DevConsoleApiContext} context
   * @returns {Promise<Stripe.Response<Stripe.BillingPortal.Session>>}
   */
  async generateCustomerPortalSession(
    context: DevConsoleApiContext,
  ): Promise<Stripe.Response<Stripe.BillingPortal.Session>> {
    const email = context.user.email;
    const customer = await this.stripe.customers.list({ email, limit: 1 });

    if (customer.data.length === 0) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.STRIPE_CUSTOMER_DOES_NOT_EXIST,
        errorCodes: ResourceNotFoundErrorCode,
        errorMessage: `Stripe customer with email ${email} not found`,
      });
    }

    return await this.stripe.billingPortal.sessions.create({
      customer: customer.data[0].id,
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
