import { ApiName } from '@apillon/lib';
import {
  createAuthenticateUserMiddleware,
  createRequestLogMiddleware,
} from '@apillon/modules-lib';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ContextMiddleware } from './middlewares/context.middleware';
import { AdminPanelModule } from './modules/admin-panel/admin-panel.module';
import { MySQLModule } from './modules/database/mysql.module';

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
      .apply(createAuthenticateUserMiddleware(ApiName.ADMIN_CONSOLE_API))
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(createRequestLogMiddleware(ApiName.ADMIN_CONSOLE_API))
      .exclude(
        { path: '*', method: RequestMethod.HEAD },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
