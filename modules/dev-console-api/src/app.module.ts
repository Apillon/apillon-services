import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContextMiddleware } from './middlewares/context.middleware';
import { MySQLModule } from './modules/database/mysql.module';
import { FileModule } from './modules/file/file.module';
import { ProjectModule } from './modules/project/project.module';
import { UserModule } from './modules/user/user.module';
import { InstructionModule } from './modules/instruction/instruction.module';
import { ServicesModule } from './modules/services/services.module';
import { BucketModule } from './modules/bucket/bucket.module';
import { DirectoryModule } from './modules/directory/directory.module';
import { StorageModule } from './modules/storage/storage.module';
import {
  AuthenticateUserMiddleware,
  createRequestLogMiddleware,
} from '@apillon/modules-lib';
import { ApiKeyModule } from './modules/api-key/api-key.module';

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
      .apply(AuthenticateUserMiddleware)
      .exclude(
        // App routes:
        { path: '/', method: RequestMethod.GET },
        { path: '/favicon.ico', method: RequestMethod.GET },
        // Auth routes:
        { path: 'user/login', method: RequestMethod.POST },
        { path: 'user/password/reset', method: RequestMethod.PATCH },
        { path: 'user/password/reset/request', method: RequestMethod.PATCH },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(createRequestLogMiddleware('dev-console-api'))
      .exclude(
        { path: '*', method: RequestMethod.HEAD },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
