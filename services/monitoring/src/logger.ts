import {
  CodeException,
  LogsQueryFilter,
  MongoCollections,
  RequestLogDto,
  RequestLogsQueryFilter,
  SystemErrorCode,
} from '@apillon/lib';
import { ServiceContext } from './context';
import { Filter, Collection } from 'mongodb';
/**
 * Logger class for logging events intodatabase.
 */
export class Logger {
  /**
   * Writes logs of system events
   * @param {any} event - The event data to be stored.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - The logged event data.
   */
  static async writeLog(event, context: ServiceContext) {
    console.log(`LOGGER: ${event?.message || JSON.stringify(event)}`);
    delete event.eventName; // Unnecessary property
    event = {
      ...event,
      ts: new Date(),
    };
    await context.mongo.db.collection(MongoCollections.LOGS).insertOne(event);
    return event;
  }

  /**
   * Writes API requests
   * @param {any} event - The event data to be stored.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - The logged event data.
   */
  static async writeRequestLog(
    { log }: { log: RequestLogDto },
    context: ServiceContext,
  ) {
    if (!log.collectionName) {
      throw new CodeException({
        status: 500,
        code: SystemErrorCode.MICROSERVICE_SYSTEM_ERROR,
        errorCodes: SystemErrorCode,
        errorMessage: 'Mongo collection name is required!',
      });
    }
    // console.log(`LOGGER: ${event?.message || JSON.stringify(event)}`);
    const event = {
      ...log,
      ts: new Date(),
    };
    delete event.collectionName; // Unnecessary property
    if (log.collectionName === MongoCollections.API_REQUEST_LOGS) {
      delete event.user_uuid;
      delete event.apiName; // apiName is always same for API request
    } else {
      delete event.apiKey; // Not used for other collections
    }

    await context.mongo.db.collection(log.collectionName).insertOne(event);
    return event;
  }

  /**
   * Get a filtered and paginated list of logs from MongoDB logs or admin-alerts table
   * @param {{ query: LogsQueryFilter }} event
   * @param {ServiceContext} context
   */
  static async listLogs(
    event: { query: LogsQueryFilter },
    context: ServiceContext,
  ) {
    const query = new LogsQueryFilter(event.query);
    const logsCollection = context.mongo.db.collection(query.collectionName);

    return Logger.executeMongoLogsQuery(logsCollection, query);
  }

  /**
   * Get a filtered and paginated list of logs from MongoDB request_logs or api_request_logs table
   * @param {{ query: RequestLogsQueryFilter }} event
   * @param {ServiceContext} context
   */
  static async listRequestLogs(
    event: { query: RequestLogsQueryFilter },
    context: ServiceContext,
  ) {
    const query = new RequestLogsQueryFilter(event.query);
    const requestLogsColl = context.mongo.db.collection(query.collectionName);

    return Logger.executeMongoLogsQuery(requestLogsColl, query);
  }

  /**
   * Given an array of API keys, return a record (dictionary) of API keys
   * and their corresponding usage count obtained from API request logs stored in MongoDB.
   * @static
   * @async
   * @param {{ apiKeys: string[] }} - array of string API keys
   * @param {ServiceContext} context
   * @returns {Promise<Record<string, number>>} - Record of API keys mapped to their usage count
   */
  static async getApiKeysUsageCount(
    { apiKeys }: { apiKeys: string[] },
    context: ServiceContext,
  ): Promise<Record<string, number>> {
    const countAggregations = await context.mongo.db
      .collection(MongoCollections.API_REQUEST_LOGS)
      .aggregate([
        // Aggregate document count for each API key
        { $match: { apiKey: { $in: apiKeys } } },
        { $group: { _id: '$apiKey', count: { $sum: 1 } } },
      ])
      .toArray();

    // Return record of API keys mapped to their respective usage count
    return countAggregations.reduce(
      (acc, doc: { _id: string; count: number }) => {
        acc[doc._id] = doc.count;
        return acc;
      },
      {},
    );
  }

  private static async generateMongoLogsQuery(
    query: LogsQueryFilter | RequestLogsQueryFilter,
  ): Promise<Filter<any>> {
    const mongoQuery = {} as any;

    // Exact match fields
    ['project_uuid', 'user_uuid', 'apiKey'].forEach(
      (field) => query[field] && (mongoQuery[field] = query[field]),
    );

    // Multiselect fields
    ['logType', 'service'].forEach(
      (field) =>
        query[`${field}s`] && (mongoQuery[field] = { $in: query[`${field}s`] }),
    );

    // Request logs have search by url, others by message
    const property = query.collectionName.includes('request_logs')
      ? 'url'
      : 'message';

    // Search by substring/regex
    query[property] = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    ['message', 'apiName', 'url'].forEach(
      (field) =>
        query[field] &&
        (mongoQuery[field] = {
          $regex: query[field],
          $options: 'i', // global regex
        }),
    );

    if (query.dateFrom) {
      mongoQuery.ts = { $gte: new Date(query.dateFrom) };
    }

    if (query.dateTo) {
      mongoQuery.ts ||= {};
      mongoQuery.ts.$lte = new Date(query.dateTo);
    }

    return mongoQuery;
  }

  private static async executeMongoLogsQuery(
    collection: Collection<any>,
    query: LogsQueryFilter | RequestLogsQueryFilter,
  ) {
    // Default sort is timestamp descending
    // -1 -> DESC, 1 -> ASC
    const sort = query.orderBy[0] || 'ts';
    const sortDir = !query.desc[0] ? -1 : query.desc[0] === 'true' ? 1 : -1;

    const mongoLogsQuery = await Logger.generateMongoLogsQuery(query);

    const items = await collection
      .find(mongoLogsQuery)
      .sort({ [sort]: sortDir })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray();

    const total = await collection.countDocuments(mongoLogsQuery);

    return { items, total };
  }
}
