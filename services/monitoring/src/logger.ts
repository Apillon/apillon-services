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
}
