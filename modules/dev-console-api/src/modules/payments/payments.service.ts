import { CodeException, Scs, SqlModelStatus } from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { Project } from '../project/models/project.model';
import { DevConsoleApiContext } from '../../context';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentsService {
  constructor(private stripe: Stripe, private stripeService: StripeService) {}

  async createStripeCreditPaymentSession(
    context: DevConsoleApiContext,
    paymentSessionDto: PaymentSessionDto,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    await this.checkProjectExists(context, paymentSessionDto.project_uuid);

    const { data: stripeId } = await new Scs().getCreditPackageStripeId(
      +paymentSessionDto.package_id,
      paymentSessionDto.project_uuid,
    );

    return await this.stripeService.generateStripeCreditPaymentSession(
      paymentSessionDto,
      stripeId,
    );
  }

  async createStripeSubscriptionPaymentSession(
    context: DevConsoleApiContext,
    paymentSessionDto: PaymentSessionDto,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    await this.checkProjectExists(context, paymentSessionDto.project_uuid);

    const { data: stripeId } = await new Scs().getSubscriptionPackageStripeId(
      +paymentSessionDto.package_id,
      paymentSessionDto.project_uuid,
    );

    return await this.stripeService.generateStripeSubscriptionPaymentSession(
      paymentSessionDto,
      stripeId,
    );
  }

  async stripeWebhookEventHandler(event: Stripe.Event) {
    // https://stripe.com/docs/api/checkout/sessions/object
    const payment = event.data.object as any;
    switch (event.type) {
      case 'checkout.session.completed': {
        if (payment.payment_status !== 'paid') {
          // In case payment session was canceled/exited
          return;
        }

        const paymentData = this.stripeService.combinePaymentData(payment);
        if (paymentData.isCreditPurchase) {
          // Get purchased items from Stripe API
          const sessionWithLineItems =
            await this.stripe.checkout.sessions.retrieve(payment.id, {
              expand: ['line_items'],
            });
          const creditPurchase = sessionWithLineItems.line_items.data[0];

          await new Scs().handleStripeWebhookData({
            ...paymentData,
            currency: creditPurchase.currency,
            invoiceStripeId: creditPurchase.price.id,
          });
        } else {
          // Call Stripe API to fetch subscription data
          const subscription = await this.stripe.subscriptions.retrieve(
            payment.subscription,
          );

          await new Scs().handleStripeWebhookData({
            ...paymentData,
            expiresOn: new Date(subscription.current_period_end * 1000),
            stripeId: subscription.id,
            currency: payment.currency,
            invoiceStripeId: payment.invoice,
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
          status: payment.cancel_at_period_end // If user has canceled subscription
            ? SqlModelStatus.INACTIVE
            : SqlModelStatus.ACTIVE,
          cancelDate: payment.canceled_at
            ? new Date(payment.canceled_at * 1000)
            : null,
          expiresOn: new Date(payment.current_period_end * 1000),
        });
        break;
      }
    }
  }

  private async checkProjectExists(
    context: DevConsoleApiContext,
    project_uuid: string,
  ) {
    const project = await new Project({}, context).populateByUUID(project_uuid);
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canModify(context);
  }
}
