import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContextMiddleware } from './middlewares/context.middleware';
import { AttestationModule } from './modules/attestation/attestation.module';
import { MySQLModule } from './modules/database/mysql.module';
import { VerificationModule } from './modules/verfication/verification.module';

@Module({
  imports: [MySQLModule, VerificationModule, AttestationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
