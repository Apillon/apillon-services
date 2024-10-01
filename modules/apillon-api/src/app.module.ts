import { AcurastModule } from './modules/acurast/acurast.module';
import { createRequestLogMiddleware } from '@apillon/modules-lib';
import { ApiName } from '@apillon/lib';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthenticateApiKeyMiddleware } from './middlewares/authentication.middleware';
import { ContextMiddleware } from './middlewares/context.middleware';
import { AuthModule } from './modules/authentication/authentication.module';
import { MySQLModule } from './modules/database/mysql.module';
import { HostingModule } from './modules/hosting/hosting.module';
import { StorageModule } from './modules/storage/storage.module';
import { SystemModule } from './modules/system/system.module';
import { NftModule } from './modules/nfts/nft.module';
import { AppController } from './app.controller';
import { IdentityModule } from './modules/wallet-identity/wallet-identity.module';
import { ComputingModule } from './modules/computing/computing.module';
import { ProjectModule } from './modules/project/project.module';
import { SocialModule } from './modules/social/social.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { EmbeddedWalletModule } from './modules/embedded-wallet/embedded-wallet.module';

@Module({
  imports: [
    MySQLModule,
    StorageModule,
    NftModule,
    HostingModule,
    SystemModule,
    AuthModule,
    SystemModule,
    IdentityModule,
    ComputingModule,
    ProjectModule,
    SocialModule,
    EmbeddedWalletModule,
    AcurastModule,
    ContractsModule,
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
      .apply(AuthenticateApiKeyMiddleware)
      .exclude(
        { path: '/', method: RequestMethod.ALL },
        { path: '/embedded-wallet/(.*)', method: RequestMethod.GET },
        { path: '/embedded-wallet/(.*)', method: RequestMethod.POST },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(createRequestLogMiddleware(ApiName.APILLON_API))
      .exclude(
        { path: '*', method: RequestMethod.HEAD },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
