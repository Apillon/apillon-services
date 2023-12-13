import { CodeException, Lmas, LogType, ServiceName, env } from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { DevConsoleApiContext } from '../../context';
import { PaymentsService } from './payments.service';
import { ResourceNotFoundErrorCode } from '../../config/types';
import axios from 'axios';

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
  ): Promise<{
    payment_id: string;
    pay_address: string;
    pay_amount: string;
    order_description: string;
  }> {
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
      const { data } = await axios.post(
        'https://api.nowpayments.io/v1/payment',
        {
          price_amount: creditPackage.price,
          price_currency: 'usd',
          pay_currency: 'dot',
          ipn_callback_url: 'https://nowpayments.io',
          order_id: project_uuid,
          order_description: creditPackage.description,
        },
        { headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY } },
      );
      const { payment_id, pay_address, pay_amount, order_description } = data;
      return { payment_id, pay_address, pay_amount, order_description };
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
}
