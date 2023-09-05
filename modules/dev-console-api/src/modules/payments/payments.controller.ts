import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('session-url')
  @UseGuards(AuthGuard)
  async getSessionUrl(): Promise<string> {
    const session = await this.paymentsService.generatePaymentSession();
    return session.url;
  }
}
