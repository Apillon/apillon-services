import { createRequestLogMiddleware } from '@apillon/modules-lib';
import { ApiName } from '@apillon/lib';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ContextMiddleware } from './middlewares/context.middleware';
import { IdentityModule } from './modules/identity/identity.module';
import { NovaWalletModule } from './modules/nova-wallet/w3n-assets.module';
import { SporranModule } from './modules/sporran/sporran.module';
import { VerificationModule } from './modules/verification/verification.module';
import { AppController } from './app.controller';
import { OtpModule } from './modules/otp/otp.module';

@Module({
  imports: [
    NovaWalletModule,
    VerificationModule,
    IdentityModule,
    SporranModule,
    OtpModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(createRequestLogMiddleware(ApiName.AUTHENTICATION_API))
      .exclude(
        { path: '*', method: RequestMethod.HEAD },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
