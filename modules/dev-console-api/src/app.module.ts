import { ApiName } from '@apillon/lib';
import {
  createAuthenticateUserMiddleware,
  createRequestLogMiddleware,
} from '@apillon/modules-lib';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ContextMiddleware } from './middlewares/context.middleware';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { ComputingModule } from './modules/computing/computing.module';
import { MySQLModule } from './modules/database/mysql.module';
import { NftsModule } from './modules/nfts/nfts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProjectModule } from './modules/project/project.module';
import { PublicModule } from './modules/public/public.module';
import { ReferralModule } from './modules/referral/referral.module';
import { ServicesModule } from './modules/services/services.module';
import { BucketModule } from './modules/storage/bucket/bucket.module';
import { DirectoryModule } from './modules/storage/directory/directory.module';
import { IpnsModule } from './modules/storage/ipns/ipns.module';
import { StorageModule } from './modules/storage/storage.module';
import { UserModule } from './modules/user/user.module';
import { SocialModule } from './modules/social/social.module';
import { AcurastModule } from './modules/acurast/acurast.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { EmbeddedWalletModule } from './modules/wallet/embedded-wallet.module';
import { RpcModule } from './modules/rpc/rpc.module';
import { IndexingModule } from './modules/indexing/indexing.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DeployModule } from './modules/deploy/deploy.module';

@Module({
  imports: [
    UserModule,
    MySQLModule,
    ProjectModule,
    ServicesModule,
    BucketModule,
    DirectoryModule,
    StorageModule,
    ApiKeyModule,
    IpnsModule,
    ReferralModule,
    NftsModule,
    NotificationModule,
    DeployModule,
    ComputingModule,
    PaymentsModule,
    PublicModule,
    SocialModule,
    EmbeddedWalletModule,
    AcurastModule,
    ContractsModule,
    RpcModule,
    IndexingModule,
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
      .apply(createAuthenticateUserMiddleware(ApiName.DEV_CONSOLE_API))
      .exclude(
        // App routes:
        { path: '/', method: RequestMethod.GET },
        { path: '/favicon.ico', method: RequestMethod.GET },
        // Auth routes:
        { path: 'deploy/webhook', method: RequestMethod.POST },
        { path: 'users/login', method: RequestMethod.POST },
        { path: 'users/login/wallet', method: RequestMethod.POST },
        { path: 'users/login-kilt', method: RequestMethod.POST },
        { path: 'users/register', method: RequestMethod.POST },
        { path: 'users/validate-email', method: RequestMethod.POST },
        { path: 'users/password-reset', method: RequestMethod.POST },
        { path: 'users/password-reset-request', method: RequestMethod.POST },
        { path: 'payments/stripe/webhook', method: RequestMethod.POST },
        { path: 'payments/crypto/webhook', method: RequestMethod.POST },
        { path: 'public/contact-us', method: RequestMethod.POST },
        { path: 'public/statistics', method: RequestMethod.GET },
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
