import { RequestLogDto } from '@apillon/lib';
import { ServiceContext } from './context';

export class Logger {
  static async writeLog(event, context: ServiceContext) {
    console.log(`LOGGER: ${event?.message || JSON.stringify(event)}`);
    event = {
      ...event,
      ts: new Date(),
    };
    await context.mongo.db.collection('logs').insertOne(event);
    return event;
  }

  static async writeRequestLog(event, context: ServiceContext) {
    // console.log(`LOGGER: ${event?.message || JSON.stringify(event)}`);
    const log: RequestLogDto = event.log;
    event = {
      ...log.serialize(),
      ts: new Date(),
    };
    await context.mongo.db.collection('request_logs').insertOne(event);
    return event;
  }
}
