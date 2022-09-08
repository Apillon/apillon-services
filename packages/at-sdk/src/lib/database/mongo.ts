import { Db, MongoClient } from 'mongodb';
import { Lmas } from '../..';
import { env } from '../../config/env';
import { AppEnvironment, LogType } from '../../config/types';

/**
 * Mongodb class.
 */
export class Mongo {
  public db: Db;
  public client: MongoClient;
  private mongoUrl: string;
  private mongoDb: string;
  private mongoPool: number;

  /**
   * Class constructor.
   * @param env Environment variables.
   */
  public constructor(serverUrl, database, poolSize = 10) {
    this.mongoUrl = serverUrl;
    this.mongoDb = database;
    this.mongoPool = poolSize;
    if (
      env.APP_ENV === AppEnvironment.TEST &&
      !/(test|testing)/i.test(this.mongoDb)
    ) {
      throw new Error('!!! NOT TEST DATABASE? !!!');
    }
  }

  /**
   * Starts database client.
   */
  public async connect(): Promise<Mongo> {
    try {
      if (!this.client) {
        this.client = await MongoClient.connect(this.mongoUrl, {
          minPoolSize: 1,
          maxPoolSize: this.mongoPool,
        });
        // if (this.client.isConnected()) {
        //   writeLog(
        //     LogType.INFO,
        //     `Connected to DB: ${this.mongoUrl} | ${this.mongoDb}`,
        //     'mongo.ts',
        //     'connect',
        //   );
        // }
        this.db = this.client.db(this.mongoDb);
      }
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `Error connecting to MongoDB: ${error.message}`,
        location: 'at-sdk/lib/database/mongo.ts',
      });
    }

    return this;
  }

  /**
   * Closes database client.
   */
  public async close(): Promise<Mongo> {
    if (this.client) {
      await this.client.close();
    }

    return this;
  }
}
