import * as dotenv from 'dotenv';

/**
 * Environment object interface.
 */
export interface Env {
  APP_ENV: string;
  DEFAULT_PAGE_SIZE: number;
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
  DEFAULT_PAGE_SIZE: parseInt(process.env['DEFAULT_PAGE_LIMIT']) || 100,
};
