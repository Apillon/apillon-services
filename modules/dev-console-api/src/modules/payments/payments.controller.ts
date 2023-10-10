import { Ctx, Validation } from '@apillon/modules-lib';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { PaymentsService } from './payments.service';
import { Headers } from '@nestjs/common';
import { ValidationGuard } from '../../guards/validation.guard';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { PricelistQueryFilter, ValidateFor } from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { StripeService } from './stripe.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private stripeService: StripeService,
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
  async postWebhook(
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
  @UseGuards(AuthGuard)
  async getSubscriptionPackages(@Ctx() context: DevConsoleApiContext) {
    return this.paymentsService.getSubscriptionPackages(context);
  }

  @Get('credit/packages')
  @UseGuards(AuthGuard)
  async getCreditPackages(@Ctx() context: DevConsoleApiContext) {
    return this.paymentsService.getCreditPackages(context);
  }

  @Get('product')
  @Validation({ dto: PricelistQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getProductPricelist(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: PricelistQueryFilter,
  ) {
    return this.paymentsService.getProductPricelist(context, query);
  }

  @Get('product/:id')
  @UseGuards(AuthGuard)
  async getProductPrice(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) product_id: number,
  ) {
    return this.paymentsService.getProductPrice(context, product_id);
  }
}
