import { Module } from '@nestjs/common';
import { env, MySql } from '@apillon/lib';

@Module({
  providers: [
    {
      provide: 'MYSQL_DB',
      useFactory: async (): Promise<MySql> => {
        try {
          const mysql = new MySql({
            host: env.DEV_CONSOLE_API_MYSQL_HOST,
            database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
            password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
            port: env.DEV_CONSOLE_API_MYSQL_PORT,
            user: env.DEV_CONSOLE_API_MYSQL_USER,
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
