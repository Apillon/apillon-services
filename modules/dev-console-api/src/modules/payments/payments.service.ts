import { AppEnvironment, CodeException, Scs, env } from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import {
  BadRequestErrorCode,
  CREDITS_PURCHASE_AMOUNT,
  CREDITS_STRIPE_ID,
  ResourceNotFoundErrorCode,
} from '../../config/types';
import { Project } from '../project/models/project.model';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class PaymentsService {
  constructor(private stripe: Stripe) {}

  async createStripePaymentSession(
    context: DevConsoleApiContext,
    paymentSessionDto: PaymentSessionDto,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    const project = await new Project({}, context).populateByUUID(
      paymentSessionDto.project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canModify(context);

    if (paymentSessionDto.credits) {
      return await this.generateStripePaymentSession(
        paymentSessionDto,
        env.APP_ENV === AppEnvironment.PROD
          ? CREDITS_STRIPE_ID.PROD
          : CREDITS_STRIPE_ID.TEST,
      );
    }
    const { data: stripeApiId } =
      await new Scs().getSubscriptionPackageStripeId(
        +paymentSessionDto.subscription_id,
        paymentSessionDto.project_uuid,
      );

    return await this.generateStripePaymentSession(
      paymentSessionDto,
      stripeApiId,
    );
  }

  async stripeWebhookEventHandler(event: Stripe.Event) {
    // https://stripe.com/docs/api/checkout/sessions/obje…ct
    const payment = event.data.object as any;
    switch (event.type) {
      case 'checkout.session.completed': {
        if (payment.payment_status !== 'paid') {
          // In case payment session was canceled/exited
          return;
        }
        const purchaseData = this.combinePaymentData(payment);
        if (purchaseData.isCreditPurchase) {
          // Get purchased items from Stripe API
          const sessionWithLineItems =
            await this.stripe.checkout.sessions.retrieve(payment.id, {
              expand: ['line_items'],
            });
          const creditPurchase = sessionWithLineItems.line_items.data[0];

          await new Scs().handleStripeWebhookData({
            ...purchaseData,
            amount: creditPurchase.quantity * CREDITS_PURCHASE_AMOUNT,
            currency: creditPurchase.currency,
            invoiceStripeId: creditPurchase.price.id,
            quantity: creditPurchase.quantity,
          });
        } else {
          // Call Stripe API to fetch subscription data
          const subscription = await this.stripe.subscriptions.retrieve(
            payment.subscription,
          );

          await new Scs().handleStripeWebhookData({
            ...purchaseData,
            expiresOn: new Date(subscription.current_period_end * 1000),
            stripeId: subscription.id,
            currency: payment.currency,
            invoiceStripeId: payment.invoice,
            quantity: 1,
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        if (event.data?.previous_attributes?.['status'] === 'incomplete') {
          return; // If update is only for a new subscription
        }
        // In case subscription is renewed or canceled
        await new Scs().updateSubscription(payment.id, {
          isCanceled: payment.cancel_at_period_end,
          cancelDate: payment.canceled_at
            ? new Date(payment.canceled_at * 1000)
            : null,
          expiresOn: new Date(payment.current_period_end * 1000),
        });
        break;
      }
    }
  }

  private combinePaymentData(paymentData: any) {
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
