import { Inject, Module } from '@nestjs/common';
import { AppEnvironment, env, getEnvSecrets, MySql } from '@apillon/lib';

@Module({
  providers: [
    {
      provide: 'MYSQL_DB',
      useFactory: async (): Promise<MySql> => {
        await getEnvSecrets();
        const config =
          env.APP_ENV === AppEnvironment.TEST
            ? {
                host: env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
                database: env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
                password: env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
                port: env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
                user: env.DEV_CONSOLE_API_MYSQL_USER_TEST,
              }
            : {
                host: env.DEV_CONSOLE_API_MYSQL_HOST,
                database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
                password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
                port: env.DEV_CONSOLE_API_MYSQL_PORT,
                user: env.DEV_CONSOLE_API_MYSQL_USER,
              };

        try {
          return new MySql(config);
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
    },
  ],
  exports: ['MYSQL_DB'],
})
export class MySQLModule {
  constructor(@Inject('MYSQL_DB') private mysql: MySql) {}

  async onModuleDestroy() {
    await this.mysql.close();
  }
}
