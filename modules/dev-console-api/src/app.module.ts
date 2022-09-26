import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticateUserMiddleware } from './middlewares/authentication.middleware';
import { ContextMiddleware } from './middlewares/context.middleware';
import { MySQLModule } from './modules/database/mysql.module';
import { FileModule } from './modules/file/file.module';
import { ProjectModule } from './modules/project/project.module';
import { UserModule } from './modules/user/user.module';
import { InstructionModule } from './modules/instruction/instruction.module';
import { ServicesModule } from './modules/services/services.module';

@Module({
  imports: [UserModule, MySQLModule, ProjectModule, FileModule, ServicesModule, InstructionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(AuthenticateUserMiddleware)
      .exclude(
        // App routes:
        { path: '/', method: RequestMethod.GET },
        { path: '/favicon.ico', method: RequestMethod.GET },
        // Auth routes:
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/password/reset', method: RequestMethod.PATCH },
        { path: 'auth/password/reset/request', method: RequestMethod.PATCH },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
