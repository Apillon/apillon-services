import { LogsQueryFilter } from '@apillon/lib';
import { ServiceContext } from './context';
import { MongoCollections } from './config/types';

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
  static async writeRequestLog(event, context: ServiceContext) {
    // console.log(`LOGGER: ${event?.message || JSON.stringify(event)}`);
    event = {
      ...event.log,
      ts: new Date(),
    };
    await context.mongo.db
      .collection(MongoCollections.REQUEST_LOGS)
      .insertOne(event);
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

    // Default sort is timestamp descending
    // -1 -> DESC, 1 -> ASC
    const sort = query.orderBy[0] || 'ts';
    const sortDir = !query.desc[0] ? -1 : query.desc[0] === 'true' ? 1 : -1;

    return await context.mongo.db
      .collection(MongoCollections.LOGS)
      .find(mongoQuery)
      .project({ data: 0, eventName: 0 }) // Exclude properties 'data' and 'eventName' from results
      .sort({ [sort]: sortDir })
      .skip(query.page * query.limit)
      .limit(query.limit)
      .toArray();
  }
}
