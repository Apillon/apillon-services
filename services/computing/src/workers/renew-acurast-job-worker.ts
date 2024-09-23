import { Context, CreateJobDto, LogType, ServiceName } from '@apillon/lib';
import { BaseSingleThreadWorker, WorkerDefinition } from '@apillon/workers-lib';
import { AcurastJob } from '../modules/acurast/models/acurast-job.model';
import { AcurastService } from '../modules/acurast/acurast.service';

/**
 * Processes all jobs which expire today (job.endTime = today)
 * and deploys a new job with the same parameters to the same cloud function
 * Runs once per day
 */
export class RenewAcurastJobWorker extends BaseSingleThreadWorker {
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runExecutor(_data: void): Promise<any> {
    const expiringJobs = await new AcurastJob(
      {},
      this.context,
    ).getExpiringToday();

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Going to renew ${expiringJobs.length} acurast jobs`,
      service: ServiceName.COMPUTING,
    });

    // Running all in parallel might be too heavy on the RPC and database
    for (const job of expiringJobs) {
      try {
        await AcurastService.createJob(
          { body: new CreateJobDto(job) },
          this.context,
          true,
        );
      } catch (err) {
        await this.writeEventLog({
          logType: LogType.ERROR,
          message: `Error processing job with ID=${job.id}`,
          service: ServiceName.COMPUTING,
          err,
        });
      }
    }
  }
}
