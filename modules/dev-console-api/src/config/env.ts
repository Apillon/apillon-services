import * as dotenv from 'dotenv';

/**
 * Environment object interface.
 */
export interface Env {
  APP_ENV: string;
  DEFAULT_PAGE_SIZE: number;
  AT_DEV_CONSOLE_API_DB: string;
  AT_DEV_CONSOLE_API_MYSQL_HOST: string;
  AT_DEV_CONSOLE_API_MYSQL_PORT: number;
  AT_DEV_CONSOLE_API_MYSQL_USER: string;
  AT_DEV_CONSOLE_API_MYSQL_PASSWORD: string;
}

/**
 * Load variables from .env.
 */
dotenv.config();

export const env: Env = {
  /**
   * Application environment.
   */
  APP_ENV: process.env['APP_ENV'] || 'development',
  // TODO defaults?
  AT_DEV_CONSOLE_API_DB: process.env['AT_DEV_CONSOLE_API_DB'] || 'ATv2_console_dev',
  AT_DEV_CONSOLE_API_MYSQL_HOST: process.env['AT_DEV_CONSOLE_API_MYSQL_HOST'] || 'lab3.kalmia.si',
  AT_DEV_CONSOLE_API_MYSQL_PORT: parseInt(process.env['AT_DEV_CONSOLE_API_MYSQL_PORT']) || 3306,
  AT_DEV_CONSOLE_API_MYSQL_USER: process.env['AT_DEV_CONSOLE_API_MYSQL_USER'] || 'root',
  AT_DEV_CONSOLE_API_MYSQL_PASSWORD: process.env['AT_DEV_CONSOLE_API_MYSQL_PASSWORD'] || 'TezkoGeslo123',
  DEFAULT_PAGE_SIZE: parseInt(process.env['DEFAULT_PAGE_LIMIT']) || 100,
};
