import * as mysql from 'mysql2/promise';
import { CodeException } from './exceptions';
import { PoolConnection } from 'mysql2/promise';
import * as SqlString from 'sqlstring';
import { isPlainObject } from './utils';
import { ApplicationEnv, LogType } from '../config/types';
import { HttpStatus } from '@nestjs/common';
// import { writeLog } from './logger';
import { Env } from '../config/env';

// TODO: writeLog is commented everywhere.

/**
 * MySQL class.
 */
export class MySql {
  public env: Env;
  public db: mysql.Pool;

  private filename = 'lib/mysql.ts';

  /**
   * Class constructor.
   * @param env Environment variables.
   */
  public constructor(env: Env) {
    this.env = env;
  }

  /**
   * Starts database client.
   */
  public async connect(): Promise<any> {
    if (!this.db) {
      try {
        this.db = this.createConnectionPool();
        // const host = this.env.APP_ENV === ApplicationEnv.TEST ? this.env.MYSQL_HOST_TEST : this.env.MYSQL_HOST;
        // const port = this.env.APP_ENV === ApplicationEnv.TEST ? this.env.MYSQL_PORT_TEST : this.env.MYSQL_PORT;
        // const database = this.env.APP_ENV === ApplicationEnv.TEST ? this.env.MYSQL_DB_TEST : this.env.MYSQL_DB;

        const host = this.env.AT_DEV_CONSOLE_API_MYSQL_USER;
        const port = this.env.AT_DEV_CONSOLE_API_MYSQL_PORT;
        const database = this.env.AT_DEV_CONSOLE_API_DB;

        if (this.env.APP_ENV === ApplicationEnv.TEST && !/(test|testing)/i.test(database)) {
          throw new Error('!!! NOT TEST DATABASE? !!!');
        }

        // test connection
        const conn = await this.db.getConnection();
        if ((conn as any).connection.stream.readyState !== 'open') {
          conn.release();
          throw new Error('Connection unsuccessful!');
        }
        conn.release();

        // writeLog(LogType.INFO, `Connected to DB: ${host}:${port} | ${database}`, 'mysql.ts', 'connect');
      } catch (err) {
        this.db = null;
        // writeLog(LogType.ERROR, 'Database connection failed.', 'mysql.ts', 'connect', err);
      }
    } else {
      // test connection
      const conn = await this.db.getConnection();
      if ((conn as any).connection.stream.readyState !== 'open') {
        conn.release();
        throw new Error('Connection unsuccessful!');
      }
      conn.release();
      // writeLog(LogType.INFO, 'Already connected to DB!', 'mysql.ts', 'connect');
    }
    return this;
  }

  private createConnectionPool() {
    return mysql.createPool({
      host: this.env.AT_DEV_CONSOLE_API_MYSQL_USER, //this.env.APP_ENV === ApplicationEnv.TEST ? this.env.MYSQL_HOST_TEST : this.env.MYSQL_HOST,
      port: this.env.AT_DEV_CONSOLE_API_MYSQL_PORT, //this.env.APP_ENV === ApplicationEnv.TEST ? this.env.MYSQL_PORT_TEST : this.env.MYSQL_PORT,
      user: this.env.AT_DEV_CONSOLE_API_MYSQL_USER, //this.env.APP_ENV === ApplicationEnv.TEST ? this.env.MYSQL_USER_TEST : this.env.MYSQL_USER,
      password: this.env.AT_DEV_CONSOLE_API_MYSQL_PASSWORD, //this.env.APP_ENV === ApplicationEnv.TEST ? this.env.MYSQL_PASSWORD_TEST : this.env.MYSQL_PASSWORD,
      database: this.env.AT_DEV_CONSOLE_API_DB, //this.env.APP_ENV === ApplicationEnv.TEST ? this.env.MYSQL_DB_TEST : this.env.MYSQL_DB,
      waitForConnections: true,
      decimalNumbers: true,
      connectionLimit: 10,
      queueLimit: 100,
      timezone: 'Z',
      // ssl: env.USE_DB_SSL ? {
      //   ca: fs.readFileSync(`${__dirname}/keys/ca-cert.pem`).toString(),
      //   key: fs.readFileSync(`${__dirname}/keys/client-key.pem`).toString(),
      //   cert: fs.readFileSync(`${__dirname}/keys/client-cert.pem`).toString()
      // } : undefined
    });
  }

  /**
   * Closes database client.
   */
  public async close(): Promise<any> {
    if (this.db) {
      await this.db.end();
    }

    return this;
  }

  /**
   * Ensures open connection to DB
   *
   */
  public async ensureAlive(conn?: mysql.PoolConnection): Promise<void> {
    if (!this.db) {
      await this.connect();
      return;
    }
    try {
      if (!conn) {
        conn = await this.db.getConnection();
      }

      if (!conn || (conn as any).connection.stream.readyState !== 'open') {
        this.db = undefined;
        await this.connect();
      }
    } catch (err) {
      this.db = undefined;
      await this.connect();
    }
  }

  /**
   * Call single stored procedure inside transaction
   *
   * @param procedure name of procedure
   * @param data procedure parameters
   * @param [options={multiSet: boolean}] additional options
   */
  public async callSingle(procedure: string, data: unknown, options: { multiSet?: boolean } = {}): Promise<any> {
    // console.time('Call Single');
    const conn = await this.start();
    try {
      const result = await this.call(procedure, data, conn, options);
      await this.commit(conn);
      // console.timeEnd( 'Call Single');
      return result;
    } catch (err) {
      await this.rollback(conn);
      // console.timeEnd( 'Call Single');
      throw err;
    }
  }

  /**
   * Call stored procedure on database
   *
   * @param procedure procedure name
   * @param data Object with call parameters
   * @returns array of results from database
   */
  public async call(
    procedure: string,
    data: any,
    connection?: PoolConnection,
    options: { multiSet?: boolean } = {},
  ): Promise<any> {
    if (!connection) {
      if (!this.db) {
        await this.connect();
      }
      connection = await this.db.getConnection();
      await this.ensureAlive(connection);
    }

    const query = `CALL ${procedure}(${
      Object.keys(data).length ? Array(Object.keys(data).length).fill('?').join(',') : ''
    });`;

    // writeLog(LogType.DB, query, this.filename, 'call');
    // writeLog(LogType.DB, this.mapValues(data, true).join(';'), this.filename, 'call');

    // console.time('SQL procedure CALL');
    const result = await connection.query(query, this.mapValues(data));
    // console.timeEnd( 'SQL procedure CALL');

    for (const resultSet of result[0] as mysql.RowDataPacket[][]) {
      if (resultSet.length && resultSet[0].ErrorCode > 0) {
        throw new CodeException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: resultSet[0].ErrorCode,
          errorMessage: resultSet[0].Message,
          details: result,
        });
      }
    }
    if (!options.multiSet) {
      return result[0][0];
    } else {
      return result[0];
    }
  }

  public async start(readUncommitted = false): Promise<PoolConnection> {
    // await this.db.query('SET SESSION autocommit = 0; START TRANSACTION;');
    if (!this.db) {
      await this.connect();
    }
    const conn = await this.db.getConnection();
    await this.ensureAlive(conn);

    //writeLog(LogType.DB, 'BEGIN TRANSACTION', 'mysql.ts', 'start');
    if (readUncommitted) {
      await conn.execute('SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;');
      //writeLog(LogType.DB, 'SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED', 'mysql.ts', 'start');
    }

    await conn.beginTransaction();

    return conn;
  }

  public async commit(connection: PoolConnection): Promise<void> {
    // await this.db.query('COMMIT; SET SESSION autocommit = 1;');
    await connection.commit();
    connection.release();
    //writeLog(LogType.DB, 'COMMIT TRANSACTION', 'mysql.ts', 'commit');
  }

  public async rollback(connection: PoolConnection): Promise<void> {
    // await this.db.query('ROLLBACK; SET SESSION autocommit = 1;');
    await connection.rollback();
    connection.release();
    //writeLog(LogType.DB, 'ROLLBACK TRANSACTION', 'mysql.ts', 'rollback');
  }

  /**
   * Translate properties to array of property values for procedure call
   *
   * @param data Object to translate
   * @param [logOutput=false] For logging purpose we should mask the password values
   * @returns Array of values
   */
  public mapValues(data: any, logOutput = false): Array<string> {
    const protectedFields = ['password'];
    const values = [];
    for (const i in data) {
      if (!logOutput || protectedFields.indexOf(i) < 0) {
        values.push(data[i]);
      } else {
        values.push('*****');
      }
    }
    return values;
  }

  /**
   * DEPRECATED METHOD - use paramExecute instead!
   * @param query SQL query with @variables
   * @param values values for variables
   * @returns SQL result
   */
  public async paramQuery(query: string, values?: unknown): Promise<Array<any>> {
    // console.time('Param Query');

    if (values) {
      for (const key of Object.keys(values)) {
        if (Array.isArray(values[key])) {
          values[key] = values[key].join(',') || null;
        }
        // SqlString.escape prevents SQL injection!
        const re = new RegExp(`@${key}\\b`, 'gi');
        query = query.replace(re, values[key] ? SqlString.escape(values[key]) : 'NULL');
      }
    }
    // console.log(query);
    //writeLog(LogType.DB, query, this.filename, 'paramQuery');
    if (!this.db) {
      await this.connect();
    }
    const conn = await this.db.getConnection();
    await this.ensureAlive(conn);
    const result = await conn.query(query);
    conn.release();

    // console.timeEnd( 'Param Query');

    return result[0] as Array<any>;
  }

  /**
   * Function replaces sql query parameters with "@variable" notation with values from object {variable: replace_value}
   * and executes prepared statement
   * @param query SQL query
   * @param values object with replacement values
   * @param connection PoolConnection reference - needed if query is part of transaction
   */
  public async paramExecute(query: string, values?: unknown, connection?: PoolConnection): Promise<Array<any>> {
    const queryId = Math.round(Math.random() * 10000);
    // console.time('Param Execute');
    // array with values for prepared statement
    // console.time(`Prepare SQL [${queryId}]`);
    const sqlParamValues = [];

    if (values) {
      // split query to array to find right order of variables
      const queryArray = query.split(/\n|\s/).filter((x) => !!x && /@.*\b/.test(x));

      for (const word of queryArray) {
        for (const key of Object.keys(values)) {
          // transform array values to string
          if (Array.isArray(values[key])) {
            if (values[key].length && isPlainObject(values[key][0])) {
              values[key] = JSON.stringify(values[key]);
            } else {
              values[key] = values[key].join(',') || null;
            }
          }

          // regex
          const re = new RegExp(`@${key}\\b`, 'gi');

          if (word.match(re)) {
            if (isPlainObject(values[key])) {
              sqlParamValues.push(JSON.stringify(values[key]));
            } else {
              sqlParamValues.push(values[key]);
            }
          }
        }
      }

      // replace keys with '?' for prepared statement
      for (const key of Object.keys(values)) {
        const re = new RegExp(`@${key}\\b`, 'gi');
        query = query.replace(re, '?');
      }
    }
    // console.timeEnd(`Prepare SQL [${queryId}]`);

    // console.log(query);
    // console.time(`Logs [${queryId}]`);
    // writeLog(LogType.DB, `[${queryId}]\n` + query, this.filename, 'paramExecute');
    // writeLog(
    //   LogType.DB,
    //   `[${queryId}] ` + JSON.stringify(this.mapValues(sqlParamValues, true)),
    //   this.filename,
    //   'paramExecute',
    // );
    // console.timeEnd(`Logs [${queryId}]`);

    let result;

    if (!connection) {
      const time = process.hrtime();
      if (!this.db) {
        await this.connect();
      }
      const conn = await this.db.getConnection();
      await this.ensureAlive(conn);
      result = await conn.execute(query, sqlParamValues);
      conn.release();
      const diff = process.hrtime(time);
      // writeLog(LogType.INFO, `SQL ${queryId} Execution time: ${diff[0]} ${diff[1] / 1000000}`);
    } else {
      const time = process.hrtime();
      try {
        result = await connection.execute(query, sqlParamValues);
      } catch (err) {
        console.log(err);
        console.log(query);
        console.log(sqlParamValues);
        throw err;
      }
      const diff = process.hrtime(time);
      // console.log('SQL %d Execution time: %ds %dms', queryId, diff[0], diff[1] / 1000000);
      //writeLog(LogType.INFO, `SQL ${queryId} Execution time: ${diff[0]} ${diff[1] / 1000000}`);
    }

    // console.timeEnd( 'Param Execute');
    return result[0] as Array<any>;
  }
}
