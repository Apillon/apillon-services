import { Context, LogType, ServiceName } from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { AcurastJob } from '../modules/acurast/models/acurast-job.model';
import { AcurastClient } from '../modules/clients/acurast.client';
import { getAcurastEndpoint } from '../lib/utils/acurast-utils';
import { AcurastJobStatus } from '../config/types';

/**
 * Processes all deployed acurast jobs and assigns their corresponding processor job addresses based on on-chain data
 */
export class AcurastJobStatusWorker extends BaseSingleThreadWorker {
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runExecutor(_data: void): Promise<any> {
    const [jobs, acurastEndpoint] = await Promise.all([
      new AcurastJob({}, this.context).getPendingJobs(),
      getAcurastEndpoint(this.context),
    ]);

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Going to process ${jobs.length} acurast jobs`,
      service: ServiceName.COMPUTING,
    });

    // Running all in parallel might be too heavy on the RPC and database
    for (const job of jobs) {
      await this.processJob(job, acurastEndpoint);
    }
  }

  private async processJob(job: AcurastJob, endpoint: string) {
    const client = new AcurastClient(endpoint);

    const jobState = await client.getJobStatus(job.deployerAddress, job.jobId);

    if (!jobState?.assigned) {
      return;
    }

    job.jobStatus = AcurastJobStatus.MATCHED;

    job.account = await client.getAssignedProcessors(
      job.deployerAddress,
      job.jobId,
    );

    job.publicKey = await client.getJobPublicKey(
      job.deployerAddress,
      job.account,
      job.jobId,
    );

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `Updating acurast job ${job.jobId} - account: ${job.account}, public key: ${job.publicKey}`,
    );

    await job.update();
  }
}
