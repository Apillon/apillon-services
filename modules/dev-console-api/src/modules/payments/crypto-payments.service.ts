import {
  CodeException,
  Lmas,
  LogType,
  Scs,
  ServiceName,
  env,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { DevConsoleApiContext } from '../../context';
import { PaymentsService } from './payments.service';
import {
  BadRequestErrorCode,
  ResourceNotFoundErrorCode,
} from '../../config/types';
import axios from 'axios';
import { CryptoPayment } from './dto/crypto-payment';
import { createHmac } from 'crypto';
import { sortObject } from '@apillon/lib';
import { pick } from 'lodash';
@Injectable()
export class CryptoPaymentsService {
  constructor(private paymentsService: PaymentsService) {}

  /**
   * Creates a crypto payment session for purchasing a credit package
   * @param {DevConsoleApiContext} context
   * @param {PaymentSessionDto} paymentSessionDto - containing the credit package and project_uuid
   * @returns {Promise<Stripe.Checkout.Session>}
   */
  async createCryptoPaymentSession(
    context: DevConsoleApiContext,
    paymentSessionDto: PaymentSessionDto,
  ): Promise<Partial<CryptoPayment>> {
    const project_uuid = paymentSessionDto.project_uuid;
    await this.paymentsService.checkProjectExists(context, project_uuid);

    const creditPackages = await this.paymentsService.getCreditPackages(
      context,
    );

    const creditPackage = creditPackages.find(
      (c) => c.id === paymentSessionDto.package_id,
    );

    if (!creditPackage) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.CREDIT_PACKAGE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    try {
      const { data } = await axios.post<CryptoPayment>(
        'https://api.nowpayments.io/v1/payment',
        {
          price_amount: creditPackage.price,
          price_currency: 'usd',
          pay_currency: 'dot',
          ipn_callback_url: 'https://nowpayments.io',
          order_id: `${project_uuid}:${creditPackage.id}`,
          order_description: creditPackage.description,
        },
        { headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY } },
      );
      return pick(data, [
        'payment_id',
        'pay_address',
        'pay_amount',
        'order_id',
        'order_description',
      ]);
    } catch (err) {
      await new Lmas().writeLog({
        context,
        project_uuid,
        logType: LogType.ERROR,
        message: `Error creating crypto payment session: ${err}`,
        user_uuid: context.user.user_uuid,
        location: 'DevConsole/CryptoPaymentsService/createCryptoPaymentSession',
        service: ServiceName.DEV_CONSOLE,
        data: {
          paymentSessionDto,
          creditPackage,
          err,
        },
        sendAdminAlert: true,
      });
      throw err;
    }
  }

  async handlePaymentWebhook(payment: CryptoPayment, signature: string) {
    const hmac = createHmac('sha512', env.IPN_SECRET_KEY);
    hmac.update(JSON.stringify(sortObject(payment)));
    if (signature !== hmac.digest('hex')) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: BadRequestErrorCode.INVALID_WEBHOOK_SIGNATURE,
        errorCodes: BadRequestErrorCode,
        errorMessage: 'Invalid webhook signature',
      });
    }

    if (payment?.payment_status !== 'confirmed') {
      return;
    }

    await new Lmas().writeLog({
      project_uuid: payment.order_id.split(':')[0],
      logType: LogType.INFO,
      message: `New crypto payment received`,
      location: 'DevConsole/CryptoPaymentsService/handlePaymentWebhook',
      service: ServiceName.DEV_CONSOLE,
      data: payment,
    });

    await new Scs().handlePaymentWebhookData({
      isCreditPurchase: true,
      project_uuid: payment.order_id.split(':')[0],
      package_id: +payment.order_id.split(':')[1],
      subtotalAmount: payment.pay_amount,
      totalAmount: payment.actually_paid,
      currency: payment.pay_currency,
    });
  }
}
