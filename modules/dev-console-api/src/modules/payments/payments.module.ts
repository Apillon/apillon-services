import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Module } from '@nestjs/common';
import Stripe from 'stripe';
import { AppEnvironment, env } from '@apillon/lib';
import { StripeService } from './stripe.service';

@Module({
  imports: [],
  controllers: [PaymentsController],
  providers: [
    StripeService,
    PaymentsService,
    {
      provide: Stripe,
      useValue: new Stripe(
        env.APP_ENV === AppEnvironment.PROD
          ? env.STRIPE_SECRET
          : env.STRIPE_SECRET_TEST,
        {
          apiVersion: '2023-08-16',
        },
      ),
    },
  ],
})
export class PaymentsModule {}
