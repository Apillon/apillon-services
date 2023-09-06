import {
  Body,
  Controller,
  Get,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { PaymentsService } from './payments.service';
import { Headers } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('session-url')
  @UseGuards(AuthGuard)
  async getSessionUrl(): Promise<string> {
    const session = await this.paymentsService.generatePaymentSession();
    return session.url;
  }

  @Post('/webhook')
  async postWebhook(
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') stripeSignature: string,
  ): Promise<any> {
    const event = this.paymentsService.getStripeEventFromSignature(
      req.rawBody,
      stripeSignature,
    );
    await this.paymentsService.onWebhookEvent(event);
  }
}
