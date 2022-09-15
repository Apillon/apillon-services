import { Module } from '@nestjs/common';
import { env, MySql } from 'at-lib';

@Module({
  providers: [
    {
      provide: 'MYSQL_DB',
      useFactory: async (): Promise<MySql> => {
        try {
          const mysql = new MySql({
            host: env.MYSQL_HOST,
            database: env.AT_DEV_CONSOLE_API_DB,
            password: env.MYSQL_PASSWORD,
            port: env.MYSQL_PORT,
            user: env.MYSQL_USER,
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
