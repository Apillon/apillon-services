import { ApiName, createRequestLogMiddleware } from '@apillon/modules-lib';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContextMiddleware } from './middlewares/context.middleware';
import { IdentityModule } from './modules/identity/identity.module';
import { NovaWalletModule } from './modules/nova-wallet/w3n-assets.module';
import { SporranModule } from './modules/sporran/sporran.module';
import { VerificationModule } from './modules/verification/verification.module';

@Module({
  imports: [
    NovaWalletModule,
    VerificationModule,
    IdentityModule,
    SporranModule,
  ],
  controllers: [AppController],
  providers: [AppService],
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
