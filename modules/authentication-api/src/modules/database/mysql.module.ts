import { Module } from '@nestjs/common';
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
                host: env.AUTH_API_MYSQL_HOST_TEST,
                database: env.AUTH_API_MYSQL_DATABASE_TEST,
                password: env.AUTH_API_MYSQL_PASSWORD_TEST,
                port: env.AUTH_API_MYSQL_PORT_TEST,
                user: env.AUTH_API_MYSQL_USER_TEST,
              }
            : {
                host: env.AUTH_API_MYSQL_HOST,
                database: env.AUTH_API_MYSQL_DATABASE,
                password: env.AUTH_API_MYSQL_PASSWORD,
                port: env.AUTH_API_MYSQL_PORT,
                user: env.AUTH_API_MYSQL_USER,
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
