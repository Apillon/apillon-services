import { env } from '../../config/env';
import { Mongo } from '../database/mongo';
import { MySql } from '../database/mysql';

async function setupDatabases() {
  const devConsoleSql = new MySql({
    host: env.DEV_CONSOLE_API_MYSQL_HOST,
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
    port: env.DEV_CONSOLE_API_MYSQL_PORT,
    user: env.DEV_CONSOLE_API_MYSQL_USER,
  });
  await devConsoleSql.connect();

  const amsSql = new MySql({
    host: env.ACCESS_MYSQL_HOST,
    database: env.ACCESS_MYSQL_DATABASE,
    password: env.ACCESS_MYSQL_PASSWORD,
    port: env.ACCESS_MYSQL_PORT,
    user: env.ACCESS_MYSQL_USER,
  });
  await amsSql.connect();

  const lmasMongo = new Mongo(
    env.MONITORING_MONGO_SRV,
    env.MONITORING_MONGO_DATABASE,
    10,
  );
  await lmasMongo.connect();

  const storageSql = new MySql({
    host: env.STORAGE_MYSQL_HOST,
    database: env.STORAGE_MYSQL_DATABASE,
    password: env.STORAGE_MYSQL_PASSWORD,
    port: env.STORAGE_MYSQL_PORT,
    user: env.STORAGE_MYSQL_USER,
  });
  await storageSql.connect();

  const configSql = new MySql({
    host: env.CONFIG_MYSQL_HOST,
    database: env.CONFIG_MYSQL_DATABASE,
    password: env.CONFIG_MYSQL_PASSWORD,
    port: env.CONFIG_MYSQL_PORT,
    user: env.CONFIG_MYSQL_USER,
  });
  await configSql.connect();

  const referralSql = new MySql({
    host: env.REFERRAL_MYSQL_HOST,
    database: env.REFERRAL_MYSQL_DATABASE,
    password: env.REFERRAL_MYSQL_PASSWORD,
    port: env.REFERRAL_MYSQL_PORT,
    user: env.REFERRAL_MYSQL_USER,
  });
  await referralSql.connect();

  const nftsSql = new MySql({
    host: env.NFTS_MYSQL_HOST,
    database: env.NFTS_MYSQL_DATABASE,
    password: env.NFTS_MYSQL_PASSWORD,
    port: env.NFTS_MYSQL_PORT,
    user: env.NFTS_MYSQL_USER,
  });
  await nftsSql.connect();

  const blockchainSql = new MySql({
    host: env.BLOCKCHAIN_MYSQL_HOST,
    database: env.BLOCKCHAIN_MYSQL_DATABASE,
    password: env.BLOCKCHAIN_MYSQL_PASSWORD,
    port: env.BLOCKCHAIN_MYSQL_PORT,
    user: env.BLOCKCHAIN_MYSQL_USER,
  });
  await blockchainSql.connect();

  const socialSql = new MySql({
    host: env.SOCIAL_MYSQL_HOST,
    database: env.SOCIAL_MYSQL_DATABASE,
    password: env.SOCIAL_MYSQL_PASSWORD,
    port: env.SOCIAL_MYSQL_PORT,
    user: env.SOCIAL_MYSQL_USER,
  });
  await socialSql.connect();

  return {
    devConsoleSql,
    amsSql,
    lmasMongo,
    storageSql,
    configSql,
    referralSql,
    nftsSql,
    blockchainSql,
    socialSql,
  };
}

async function main() {
  const databases = await setupDatabases();
}
