/*
 * Script used for populating the 'metadata' field for all users, specifically adding the 'country' key to the metadata.
 * Queries all existing mongo logs to find a request made by the user according to their user_uuid, then obtains the country for that user from the mongo record.
 * Note this is only ran once, for all future users the country is populated in the metadata upon registration.
 */
import {
  Mongo,
  MongoCollections,
  MySql,
  SqlModelStatus,
  env,
  getEnvSecrets,
} from '@apillon/lib';
import { DbTables } from '../../config/types';

let devConsoleSql: MySql;

async function initializeDb() {
  await getEnvSecrets();
  devConsoleSql = new MySql({
    host: env.DEV_CONSOLE_API_MYSQL_HOST,
    port: env.DEV_CONSOLE_API_MYSQL_PORT,
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
    user: env.DEV_CONSOLE_API_MYSQL_USER,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
  });
  await devConsoleSql.connect();
}

async function populateUserCountries() {
  const mongo = new Mongo(
    env.MONITORING_MONGO_SRV,
    env.MONITORING_MONGO_DATABASE,
  );
  console.log(`Connecting to MongoDB...`);
  await mongo.connect();
  console.log(`Mongo is CONNECTED to the server!`);

  const allUsers = await devConsoleSql.paramExecute(
    `SELECT * FROM \`${DbTables.USER}\` WHERE \`status\` = ${SqlModelStatus.ACTIVE}`,
  );

  const updatePromises = [];

  for (const user of allUsers) {
    const user_uuid = user.user_uuid;

    const userRecord = await mongo.db
      .collection(MongoCollections.REQUEST_LOGS)
      .findOne({ user_uuid });

    if (!userRecord?.country) {
      continue;
    }
    console.log(`Adding user ${user_uuid} with country ${userRecord.country}`);

    updatePromises.push(
      devConsoleSql.paramExecute(
        `UPDATE \`${DbTables.USER}\` SET \`metadata\` = JSON_SET(\`metadata\`, '$.country', @country) WHERE \`user_uuid\` = @user_uuid`,
        {
          country: userRecord.country,
          user_uuid,
        },
      ),
    );
  }

  await Promise.all(updatePromises);
  console.log('Finished updating all user records');

  await mongo.close();
  console.log(`Mongo is DISCONNECTED from server!`);
}

void initializeDb().then(populateUserCountries);
