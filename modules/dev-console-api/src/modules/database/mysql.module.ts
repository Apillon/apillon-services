import { Module } from '@nestjs/common';
import { AppEnvironment, env, MySql } from 'at-lib';

@Module({
  providers: [
    {
      provide: 'MYSQL_DB',
      useFactory: async (): Promise<MySql> => {
        const config =
          env.APP_ENV === AppEnvironment.TEST
            ? {
                host: env.AT_DEV_CONSOLE_API_MYSQL_HOST_TEST,
                database: env.AT_DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
                password: env.AT_DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
                port: env.AT_DEV_CONSOLE_API_MYSQL_PORT_TEST,
                user: env.AT_DEV_CONSOLE_API_MYSQL_USER_TEST,
              }
            : {
                host: env.AT_DEV_CONSOLE_API_MYSQL_HOST,
                database: env.AT_DEV_CONSOLE_API_MYSQL_DATABASE,
                password: env.AT_DEV_CONSOLE_API_MYSQL_PASSWORD,
                port: env.AT_DEV_CONSOLE_API_MYSQL_PORT,
                user: env.AT_DEV_CONSOLE_API_MYSQL_USER,
              };

        try {
          const mysql = new MySql(config);
          await mysql.connect();
          return mysql;
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
    },
  ],
  exports: ['MYSQL_DB'],
})
export class MySQLModule {}
