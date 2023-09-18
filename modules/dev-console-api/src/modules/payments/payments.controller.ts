import { Validation } from '@apillon/modules-lib';
import {
  Controller,
  Get,
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
import { ValidateFor } from '@apillon/lib';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('stripe-session-url')
  @Validation({ dto: PaymentSessionDto, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getStripeSessionUrl(
    @Query() paymentSessionDto: PaymentSessionDto,
  ): Promise<string> {
    const session = await this.paymentsService.createStripePaymentSession(
      paymentSessionDto,
    );
    return session.url;
  }

  @Post('/webhook')
  async postWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') stripeSignature: string,
  ): Promise<any> {
    const event = this.paymentsService.getStripeEventFromSignature(
      req.rawBody,
      stripeSignature,
    );
    await this.paymentsService.stripeWebhookEventHandler(event);
  }
}
