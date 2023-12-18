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
import { CryptoInvoicePayment, CryptoPayment } from './dto/crypto-payment';
import { createHmac } from 'crypto';
import { sortObject } from '@apillon/lib';

@Injectable()
export class CryptoPaymentsService {
  constructor(private paymentsService: PaymentsService) {}

  /**
   * Creates a crypto payment session for purchasing a credit package
   * @param {DevConsoleApiContext} context
   * @param {PaymentSessionDto} paymentSessionDto - containing the credit package and project_uuid
   * @returns {Promise<CryptoInvoicePayment>}
   */
  async createCryptoPayment(
    context: DevConsoleApiContext,
    paymentSessionDto: PaymentSessionDto,
  ): Promise<CryptoInvoicePayment> {
    const project_uuid = paymentSessionDto.project_uuid;
    await this.paymentsService.checkProjectExists(context, project_uuid);

    const creditPackages = await this.paymentsService.getCreditPackages(
      context,
    );

    const creditPackage = creditPackages.find(
      (c) => c.id == paymentSessionDto.package_id,
    );

    if (!creditPackage) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.CREDIT_PACKAGE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    try {
      const { data } = await axios.post<CryptoInvoicePayment>(
        'https://api.nowpayments.io/v1/invoice',
        {
          price_amount: creditPackage.price,
          price_currency: 'usd',
          pay_currency: 'dot',
          ipn_callback_url: env.IPN_CALLBACK_URL,
          order_id: `${project_uuid}#${creditPackage.id}`,
          order_description: creditPackage.description,
          success_url: paymentSessionDto.returnUrl,
          cancel_url: paymentSessionDto.returnUrl,
        },
        { headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY } },
      );
      return data;
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

  /**
   * Get a crypto payment details by its ID
   * @param {string} paymentId
   * @returns {Promise<CryptoPayment>}
   */
  async getCryptoPayment(paymentId: string): Promise<CryptoPayment> {
    const { data } = await axios.get<CryptoPayment>(
      `https://api.nowpayments.io/v1/payment/${paymentId}`,
      { headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY } },
    );
    return data;
  }

  /**
   * Handle a crypto payment webhook, add credits to projects based on payment
   * @param {CryptoPayment} payment - The payment metadata
   * @param {string} signature - The signature used for verification of the webhook data
   */
  async handleCryptoPaymentWebhook(payment: CryptoPayment, signature: string) {
    const hmac = createHmac('sha512', env.IPN_SECRET_KEY);
    hmac.update(JSON.stringify(sortObject(payment)));
    // Verify that webhook source is authentic through signature provided in request header
    if (signature !== hmac.digest('hex')) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: BadRequestErrorCode.INVALID_WEBHOOK_SIGNATURE,
        errorCodes: BadRequestErrorCode,
        errorMessage: 'Invalid webhook signature',
      });
    }

    const [project_uuid, package_id] = payment.order_id.split('#');
    if (
      [
        'waiting',
        'confirming',
        'confirmed',
        'partially_paid',
        'failed',
      ].includes(payment.payment_status)
    ) {
      await new Lmas().writeLog({
        project_uuid,
        logType: LogType.INFO,
        message: `Received crypto payment in status ${payment.payment_status}`,
        location: 'DevConsole/CryptoPaymentsService/handlePaymentWebhook',
        service: ServiceName.DEV_CONSOLE,
        data: payment,
      });
    }

    if (payment.payment_status !== 'confirmed') {
      // Only add credits if payment is confirmed
      return;
    }

    await new Scs().handlePaymentWebhookData({
      isCreditPurchase: true,
      project_uuid,
      package_id: +package_id,
      subtotalAmount: payment.pay_amount,
      totalAmount: payment.actually_paid,
      currency: payment.pay_currency,
    });

    await new Lmas().writeLog({
      project_uuid,
      logType: LogType.INFO,
      message: `Crypto payment settled and credits added`,
      location: 'DevConsole/CryptoPaymentsService/handlePaymentWebhook',
      service: ServiceName.DEV_CONSOLE,
      data: payment,
    });
  }
}
