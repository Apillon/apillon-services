import { ServerlessWorker } from './serverless-worker';
import { WorkerDefinition } from './worker-definition';
import { ServiceDefinition } from './interfaces';
import { WorkerLogStatus } from '../../config/types';
import { writeWorkerLog } from '../logger';
import { Context } from '@apillon/lib';

export abstract class WorkerScheduler extends ServerlessWorker {
  protected context: Context;

  public constructor(
    serviceDefinition: ServiceDefinition,
    workerName = 'scheduler',
  ) {
    super(new WorkerDefinition(serviceDefinition, workerName));
  }

  /**
   * should return definitions for workers to be started
   */
  public abstract getWorkerDefinitions(): Promise<Array<WorkerDefinition>>;

  public async execute() {
    const defs = await this.getWorkerDefinitions();
    await this.launchWorkers(defs);
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
        'Scheduler',
        null,
        message,
        data,
      );
      this.logFn(`Scheduler: ${message}`, err);
    } catch (error) {
      console.log('ERROR writing worker log to database!');
      this.logFn(`Scheduler: ${error.message}`, error);
    }
  }
}
