import { CryptoPaymentsService } from './crypto-payments.service';
import { CacheInterceptor, Ctx, Validation, Cache } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { PaymentsService } from './payments.service';
import { Headers } from '@nestjs/common';
import { ValidationGuard } from '../../guards/validation.guard';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { CacheKeyPrefix, CacheKeyTTL, PricelistQueryFilter, ValidateFor } from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { StripeService } from './stripe.service';
import { CryptoPayment } from './dto/crypto-payment';

@Controller('payments')
@UseInterceptors(CacheInterceptor)
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private stripeService: StripeService,
    private cryptoPaymentsService: CryptoPaymentsService,
  ) {}

  @Get('stripe/credit-session-url')
  @Validation({ dto: PaymentSessionDto, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getStripeCreditSessionUrl(
    @Query() paymentSessionDto: PaymentSessionDto,
    @Ctx() context: DevConsoleApiContext,
  ): Promise<string> {
    const session = await this.paymentsService.createStripeCreditPaymentSession(
      context,
      paymentSessionDto,
    );
    return session.url;
  }

  @Get('stripe/subscription-session-url')
  @Validation({ dto: PaymentSessionDto, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getStripeSubscriptionSessionUrl(
    @Query() paymentSessionDto: PaymentSessionDto,
    @Ctx() context: DevConsoleApiContext,
  ): Promise<string> {
    const session =
      await this.paymentsService.createStripeSubscriptionPaymentSession(
        context,
        paymentSessionDto,
      );
    return session.url;
  }

  @Get('stripe/customer-portal-session-url')
  @UseGuards(AuthGuard)
  async getCustomerPortalSession(
    @Ctx() context: DevConsoleApiContext,
  ): Promise<any> {
    const session = await this.stripeService.generateCustomerPortalSession(
      context,
    );
    return session.url;
  }

  @Post('stripe/webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') stripeSignature: string,
  ): Promise<any> {
    const event = this.stripeService.getStripeEventFromSignature(
      req.rawBody,
      stripeSignature,
    );
    await this.paymentsService.stripeWebhookEventHandler(event);
  }

  @Get('subscription/packages')
  @Cache({ keyPrefix: CacheKeyPrefix.PAYMENTS_SUBSCRIPTION_PACKAGES, ttl: CacheKeyTTL.EXTRA_LONG })
  @UseGuards(AuthGuard)  
  async getSubscriptionPackages(@Ctx() context: DevConsoleApiContext) {
    return this.paymentsService.getSubscriptionPackages(context);
  }

  @Get('credit/packages')
  @Cache({ keyPrefix: CacheKeyPrefix.PAYMENTS_CREDIT_PACKAGES, ttl: CacheKeyTTL.EXTRA_LONG })
  @UseGuards(AuthGuard)
  async getCreditPackages(@Ctx() context: DevConsoleApiContext) {
    return this.paymentsService.getCreditPackages(context);
  }

  @Get('products/price-list')
  @Cache({ keyPrefix: CacheKeyPrefix.PRODUCT_PRICE_LIST, ttl: CacheKeyTTL.EXTRA_LONG })
  @Validation({ dto: PricelistQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getProductPricelist(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: PricelistQueryFilter,
  ) {
    return this.paymentsService.getProductPricelist(context, query);
  }

  @Get('products/:id/price')
  @Cache({ keyPrefix: CacheKeyPrefix.PRODUCT_PRICE, ttl: CacheKeyTTL.EXTRA_LONG })
  @UseGuards(AuthGuard)
  async getProductPrice(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) product_id: number,
  ) {
    return this.paymentsService.getProductPrice(context, product_id);
  }

  @Post('crypto/payment')
  @Validation({ dto: PaymentSessionDto, validateFor: ValidateFor.BODY })
  @UseGuards(AuthGuard, ValidationGuard)
  async createCryptoPaymentSession(
    @Body() paymentSessionDto: PaymentSessionDto,
    @Ctx() context: DevConsoleApiContext,
  ): Promise<any> {
    return await this.cryptoPaymentsService.createCryptoPaymentSession(
      context,
      paymentSessionDto,
    );
  }

  @Get('crypto/payment/:id')
  @UseGuards(AuthGuard)
  async getCryptoPayment(@Param('id') paymentId: string): Promise<any> {
    return await this.cryptoPaymentsService.getCryptoPayment(paymentId);
  }

  @Post('crypto/webhook')
  async handleCryptoPaymentWebhook(
    @Body() body: CryptoPayment,
    @Headers('x-nowpayments-sig') cryptoSignature: string,
  ): Promise<any> {
    await this.cryptoPaymentsService.handleCryptoPaymentWebhook(
      body,
      cryptoSignature,
    );
  }
}
