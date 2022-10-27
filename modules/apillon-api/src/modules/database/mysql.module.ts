import { Module } from '@nestjs/common';
import { env, MySql } from 'at-lib';

@Module({
  providers: [
    {
      provide: 'MYSQL_DB',
      useFactory: async (): Promise<MySql> => {
        try {
          const mysql = new MySql({
            host: env.AT_DEV_CONSOLE_API_MYSQL_HOST,
            database: env.AT_DEV_CONSOLE_API_MYSQL_DATABASE,
            password: env.AT_DEV_CONSOLE_API_MYSQL_PASSWORD,
            port: env.AT_DEV_CONSOLE_API_MYSQL_PORT,
            user: env.AT_DEV_CONSOLE_API_MYSQL_USER,
          });
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
