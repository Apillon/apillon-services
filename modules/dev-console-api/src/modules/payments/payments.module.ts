import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Module } from '@nestjs/common';
import Stripe from 'stripe';
import { env } from '@apillon/lib';

@Module({
  imports: [],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: Stripe,
      useValue: new Stripe(env.STRIPE_SECRET_TEST, {
        apiVersion: '2023-08-16',
      }),
    },
  ],
})
export class PaymentsModule {}
