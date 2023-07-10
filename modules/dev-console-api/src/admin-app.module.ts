import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AdminPanelModule } from './modules/admin-panel/admin-panel.module';
import { MySQLModule } from './modules/database/mysql.module';
import { env } from '@apillon/lib';
import {
  AuthenticateUserMiddleware,
  createRequestLogMiddleware,
} from '@apillon/modules-lib';
import { ContextMiddleware } from './middlewares/context.middleware';

@Module({
  imports: [MySQLModule, AdminPanelModule],
  controllers: [],
  providers: [],
})
export class AdminAppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(AuthenticateUserMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(createRequestLogMiddleware(`admin-console-api (${env.APP_ENV})`))
      .exclude(
        { path: '*', method: RequestMethod.HEAD },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
