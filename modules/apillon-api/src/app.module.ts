import { env } from '@apillon/lib';
import { createRequestLogMiddleware } from '@apillon/modules-lib';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticateApiKeyMiddleware } from './middlewares/authentication.middleware';
import { ContextMiddleware } from './middlewares/context.middleware';
import { AuthModule } from './modules/authentication/authentication.module';
import { MySQLModule } from './modules/database/mysql.module';
import { HostingModule } from './modules/hosting/hosting.module';
import { StorageModule } from './modules/storage/storage.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    MySQLModule,
    StorageModule,
    HostingModule,
    SystemModule,
    AuthModule,
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
      .apply(AuthenticateApiKeyMiddleware)
      .exclude({ path: '/', method: RequestMethod.ALL })
      .exclude({ path: '/hosting/domains', method: RequestMethod.ALL })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(createRequestLogMiddleware(`apillon-api (${env.APP_ENV})`))
      .exclude(
        { path: '*', method: RequestMethod.HEAD },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
