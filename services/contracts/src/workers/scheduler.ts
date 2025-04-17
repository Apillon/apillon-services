import {
  WorkerScheduler,
  WorkerDefinition,
  ServiceDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { Job } from '@apillon/workers-lib';
import { Context } from '@apillon/lib';

export class Scheduler extends WorkerScheduler {
  public constructor(serviceDefinition: ServiceDefinition, context: Context) {
    super(serviceDefinition);
    this.context = context;
  }

  public async getWorkerDefinitions(): Promise<WorkerDefinition[]> {
    const defs = [] as Array<WorkerDefinition>;

    const jobs = await new Job({}, this.context).getPendingJobs();

    for (const job of jobs) {
      console.log(`${job.name} scheduled to run`);
      // await this.writeLogToDb(
      //   WorkerLogStatus.INFO,
      //   `${job.name} scheduled to run`,
      //   job,
      // );
      if (!job.name) continue;

      defs.push(
        new WorkerDefinition(
          this.workerDefinition.serviceDefinition,
          job.name,
          job.getWorkerDefinition(),
        ),
      );
    }

    return defs;
  }

  public async before(): Promise<any> {
    // this.logFn('Before execution!');
    // await this.writeLogToDb(WorkerLogStatus.START, 'Job started');
  }

  public async onSuccess(): Promise<any> {
    // await this.writeLogToDb(WorkerLogStatus.SUCCESS, 'Job completed!');
  }

  public async onError(error): Promise<any> {
    await this.writeLogToDb(WorkerLogStatus.ERROR, 'Error!', null, error);
    throw error;
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    // this.logFn(JSON.stringify(this.workerDefinition, null, 2));
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
