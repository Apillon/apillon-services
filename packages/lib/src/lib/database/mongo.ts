import { Db, MongoClient } from 'mongodb';
import { env } from '../../config/env';
import { AppEnvironment, LogType } from '../../config/types';
import { writeLog } from '../logger';

/**
 * Mongodb class.
 */
export class Mongo {
  public db: Db;
  public client: MongoClient;
  private mongoUrl: string;
  private mongoDb: string;
  private mongoPool: number;
  private filename = '@apillon/lib/lib/database/mongo.ts';

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
      throw new Error(`!!! ${this.mongoDb} NOT TEST DATABASE? !!!`);
    }
  }

  /**
   * Starts database client.
   */
  public async connect(): Promise<Mongo> {
    try {
      if (!this.client) {
        console.log('Connecting client...');
        this.client = await MongoClient.connect(this.mongoUrl, {
          minPoolSize: 1,
          maxPoolSize: this.mongoPool,
        });

        this.db = this.client.db(this.mongoDb);
        console.log('Testing connection...');
        const res = await this.db.command({ ping: 1 });
        console.log(res);
        writeLog(
          LogType.INFO,
          `Connected to DB: ${this.mongoUrl} | ${this.mongoDb}`,
          'mongo.ts',
          'connect',
        );
      }
    } catch (error) {
      // do not handle error here as it can cause infinite loop if you log to the database!!
      // console.error(`Error connecting to MongoDB: ${error.message}`);
      writeLog(
        LogType.ERROR,
        'MongoDB connection failed.',
        this.filename,
        'connect',
        error,
      );
      throw error;
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
