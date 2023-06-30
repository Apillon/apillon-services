import { NovaWalletModule } from './modules/nova-wallet/w3n-assets.module';
import { env } from '@apillon/lib';
import { createRequestLogMiddleware } from '@apillon/modules-lib';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContextMiddleware } from './middlewares/context.middleware';
import { IdentityModule } from './modules/identity/identity.module';
import { MySQLModule } from './modules/database/mysql.module';
import { VerificationModule } from './modules/verification/verification.module';
import { SporranModule } from './modules/sporran/sporran.module';

@Module({
  imports: [
    NovaWalletModule,
    MySQLModule,
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
      .apply(createRequestLogMiddleware(`authentication-api (${env.APP_ENV})`))
      .exclude(
        { path: '*', method: RequestMethod.HEAD },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
