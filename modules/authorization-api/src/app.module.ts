import { env } from '@apillon/lib';
import { createRequestLogMiddleware } from '@apillon/modules-lib';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContextMiddleware } from './middlewares/context.middleware';
import { MySQLModule } from './modules/database/mysql.module';

@Module({
  imports: [MySQLModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(createRequestLogMiddleware(`authorization-api (${env.APP_ENV})`))
      .exclude(
        { path: '*', method: RequestMethod.HEAD },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
