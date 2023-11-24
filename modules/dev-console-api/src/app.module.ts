import { StripeService } from './modules/payments/stripe.service';
import { PaymentsModule } from './modules/payments/payments.module';
import { PublicModule } from './modules/public/public.module';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ContextMiddleware } from './middlewares/context.middleware';
import { MySQLModule } from './modules/database/mysql.module';
import { FileModule } from './modules/file/file.module';
import { ProjectModule } from './modules/project/project.module';
import { UserModule } from './modules/user/user.module';
import { InstructionModule } from './modules/instruction/instruction.module';
import { ServicesModule } from './modules/services/services.module';
import { BucketModule } from './modules/storage/bucket/bucket.module';
import { DirectoryModule } from './modules/storage/directory/directory.module';
import { StorageModule } from './modules/storage/storage.module';
import {
  AuthenticateUserMiddleware,
  createRequestLogMiddleware,
} from '@apillon/modules-lib';
import { ApiName } from '@apillon/lib';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { NftsModule } from './modules/nfts/nfts.module';
import { IpnsModule } from './modules/storage/ipns/ipns.module';
import { ReferralModule } from './modules/referral/referral.module';
import { ComputingModule } from './modules/computing/computing.module';

@Module({
  imports: [
    UserModule,
    MySQLModule,
    ProjectModule,
    FileModule,
    ServicesModule,
    InstructionModule,
    BucketModule,
    DirectoryModule,
    StorageModule,
    ApiKeyModule,
    IpnsModule,
    ReferralModule,
    NftsModule,
    ComputingModule,
    PaymentsModule,
    PublicModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(AuthenticateUserMiddleware)
      .exclude(
        // App routes:
        { path: '/', method: RequestMethod.GET },
        { path: '/favicon.ico', method: RequestMethod.GET },
        // Auth routes:
        { path: 'users/login', method: RequestMethod.POST },
        { path: 'users/login/wallet', method: RequestMethod.POST },
        { path: 'users/login-kilt', method: RequestMethod.POST },
        { path: 'users/register', method: RequestMethod.POST },
        { path: 'users/validate-email', method: RequestMethod.POST },
        { path: 'users/password-reset', method: RequestMethod.POST },
        { path: 'users/password-reset-request', method: RequestMethod.POST },
        { path: 'payments/stripe-webhook', method: RequestMethod.POST },
        { path: 'public/contact-us', method: RequestMethod.POST },
        {
          path: 'websites/:website_uuid/deployments/:deployment_uuid/approve',
          method: RequestMethod.GET,
        },
        {
          path: 'websites/:website_uuid/deployments/:deployment_uuid/reject',
          method: RequestMethod.POST,
        },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(createRequestLogMiddleware(ApiName.DEV_CONSOLE_API))
      .exclude(
        { path: '*', method: RequestMethod.HEAD },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
