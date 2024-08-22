import {
  Context,
  LogType,
  PoolConnection,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { AcurastJob } from '../modules/acurast/models/acurast-job.model';
import { AcurastClient } from '../modules/clients/acurast.client';
import { getAcurastEndpoint } from '../lib/utils/acurast-utils';
import { AcurastJobStatus } from '../config/types';
import { CloudFunction } from '../modules/acurast/models/cloud-function.model';

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
      const conn = await this.context.mysql.start();
      try {
        await this.processJob(job, acurastEndpoint, conn);
        await this.context.mysql.commit(conn);
      } catch (err) {
        await this.context.mysql.rollback(conn);
        await this.writeEventLog({
          logType: LogType.ERROR,
          message: `Error processing job with ID=${job.id}`,
          service: ServiceName.COMPUTING,
          err,
        });
      }
    }
  }

  private async processJob(
    job: AcurastJob,
    endpoint: string,
    conn: PoolConnection,
  ) {
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

    const cloudFunction = await new CloudFunction(
      {},
      this.context,
    ).populateByUUID(job.function_uuid);

    cloudFunction.populate({
      activeJob_uuid: job.job_uuid,
      status: SqlModelStatus.ACTIVE,
    });

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `Updating acurast job ${job.jobId} - account: ${job.account}, public key: ${job.publicKey}`,
    );

    await Promise.all([
      job.update(SerializeFor.UPDATE_DB, conn),
      cloudFunction.update(SerializeFor.UPDATE_DB, conn),
    ]);
  }
}
