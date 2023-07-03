import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AdminPanelModule } from './modules/admin-panel/admin-panel.module';
import { AppModule } from './app.module';
import { MySQLModule } from './modules/database/mysql.module';

@Module({
  imports: [MySQLModule, AdminPanelModule],
  controllers: [],
  providers: [],
})
export class AdminAppModule {
  configure(consumer: MiddlewareConsumer) {
    const appModule = new AppModule();
    appModule.setLogsPrefix('admin-console-api');
    appModule.configure(consumer);
  }
}
