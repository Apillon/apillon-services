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
import {
  BadRequestErrorCode,
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
    const session = event.data.object as any;
    switch (event.type) {
      case 'checkout.session.completed': {
        // https://stripe.com/docs/api/checkout/sessions/object
        if (session.payment_status !== 'paid') {
          return;
        }
        const { project_uuid, package_id } = session.metadata;
        const isCreditPurchase = session.metadata.isCreditPurchase === 'true';
        if (isCreditPurchase) {
          // TODO: handle credit purchase
        } else {
          const subscription = await this.stripe.subscriptions.retrieve(
            session.subscription,
          );

          await new Scs().createSubscription(
            new CreateSubscriptionDto({
              project_uuid,
              package_id,
              expiresOn: new Date(subscription.current_period_end * 1000),
              subscriberEmail: session.customer_details.email,
              stripeId: subscription.id,
            }),
          );
          break;
        }
      }
      case 'customer.subscription.updated':
        // In case subscription is renewed or canceled
        await new Scs().updateSubscription(session.id, {
          isCanceled: session.cancel_at_period_end,
          cancelDate: session.canceled_at
            ? new Date(session.canceled_at * 1000)
            : null,
          expiresOn: new Date(session.current_period_end * 1000),
        });
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
