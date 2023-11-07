import { AppEnvironment, MySql, env } from '@apillon/lib';

export function getConsoleApiMysql() {
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

  return new MySql(config);
}
