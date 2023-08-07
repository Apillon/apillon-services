import {
  CodeException,
  LogsQueryFilter,
  MongoCollections,
  RequestLogDto,
  SystemErrorCode,
} from '@apillon/lib';
import { ServiceContext } from './context';

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
      delete event.apiName; // apiName is always same for API request
    }

    await context.mongo.db.collection(log.collectionName).insertOne(event);
    return event;
  }

  static async listLogs(event, context: ServiceContext) {
    const query = new LogsQueryFilter(event.query);
    const mongoQuery = {} as any;

    // Text search properties of query
    ['project_uuid', 'user_uuid', 'logType', 'service'].forEach(
      (field) => query[field] && (mongoQuery[field] = query[field]),
    );

    if (query.dateFrom) {
      mongoQuery.ts = { $gte: new Date(query.dateFrom) };
    }

    if (query.dateTo) {
      mongoQuery.ts ||= {};
      mongoQuery.ts.$lte = new Date(query.dateTo);
    }

    if (query.search) {
      // Search message by substring
      mongoQuery.message = {
        $regex: query.search,
        $options: 'i',
      };
    }

    // Default sort is timestamp descending
    // -1 -> DESC, 1 -> ASC
    const sort = query.orderBy[0] || 'ts';
    const sortDir = !query.desc[0] ? -1 : query.desc[0] === 'true' ? 1 : -1;

    const logsCollection = context.mongo.db.collection(MongoCollections.LOGS);

    const items = await logsCollection
      .find(mongoQuery)
      .project({ eventName: 0 }) // Exclude property 'eventName' from results
      .sort({ [sort]: sortDir })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray();

    const total = await logsCollection.countDocuments(mongoQuery);

    return { items, total };
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
}
