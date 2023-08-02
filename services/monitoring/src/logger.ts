import { LogsQueryFilter } from '@apillon/lib';
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
    event = {
      ...event,
      ts: new Date(),
      eventName: undefined, // Unnecessary property
    };
    await context.mongo.db.collection('logs').insertOne(event);
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
    await context.mongo.db.collection('request_logs').insertOne(event);
    return event;
  }

  static async listLogs(event, context: ServiceContext) {
    const query: LogsQueryFilter = event.query;
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

    return await context.mongo.db
      .collection('logs')
      .find(mongoQuery)
      .project({ data: 0, eventName: 0 }) // Exclude property 'data' and 'eventName' from result
      .sort({ ts: -1 }) // Sort by timestamp descending
      .skip(query.page * query.limit)
      .limit(query.limit)
      .toArray();
  }
}
