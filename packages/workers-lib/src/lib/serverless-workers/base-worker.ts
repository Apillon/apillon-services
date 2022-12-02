import type { Context } from '@apillon/lib';
import { ServerlessWorker, WorkerDefinition } from '.';
import { writeWorkerLog } from '../logger';
import { WorkerLogStatus } from '../../config/types';
export abstract class BaseWorker extends ServerlessWorker {
  protected context: Context;
  protected workerName: string;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition);
    this.context = context;
    this.workerName = workerDefinition.workerName;
  }

  /**
   * Write log to database
   * @param status worker status
   * @param message message
   * @param data any data in JSON
   * @param err Error object
   */
  protected async writeLogToDb(
    status: WorkerLogStatus,
    message: string,
    data?: any,
    err?: Error,
  ) {
    try {
      if (err) {
        message += ` (${err.message})`;
        status = WorkerLogStatus.ERROR;
      }
      await writeWorkerLog(
        this.context,
        status,
        this.workerName,
        null,
        message,
        data,
      );
      this.logFn(`${this.workerName} ${message}`, err);
    } catch (error) {
      console.log('ERROR writing worker log to database!');
      this.logFn(`${this.workerName} ${error.message}`, error);
    }
  }
}
