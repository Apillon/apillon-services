import { WorkerDefinition } from '.';
import { Context, SerializeFor } from '@apillon/lib';
import { DbTables, WorkerLogStatus } from '../../config/types';
import { Job, JobStatus } from '../../modules/job/job.model';
import { BaseWorker } from './base-worker';
import moment from 'moment';

export enum SingleThreadWorkerAlertType {
  MISSING_JOB_DEFINITION,
  JOB_LOCKED,
}
export abstract class BaseSingleThreadWorker extends BaseWorker {
  private job: Job;
  private shouldRunJob = true;

  /**
   * Worker that is forced to run as in single thread.
   * All parallel instances will fail to run.
   * @param workerDefinition
   * @param context
   */
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public abstract runExecutor(data: any): Promise<any>;

  /**
   * Function fires on missing job definition or hitting a locked status (job already running).
   *
   * By default JOB_LOCKED_ERROR is handled in a way
   * that DOES NOT result in lambda error (message is discarded and will not return to queue)
   *
   * Can be overridden if different outcome is desired.
   *
   * @param _job job object
   * @param alertType SingleThreadWorkerAlertType
   */
  public async onAlert(
    _job: Job,
    alertType: SingleThreadWorkerAlertType,
  ): Promise<void | any> {
    if (alertType === SingleThreadWorkerAlertType.JOB_LOCKED) {
      // by default JOB_LOCKED is handled in a way that DOES NOT result in lambda error (message is discarded and will not return to queue)
      return;
    }
    if (alertType === SingleThreadWorkerAlertType.MISSING_JOB_DEFINITION) {
      throw new Error(
        `MISSING_JOB_DEFINITION: Job not found: (ID = ${this.workerDefinition.id}`,
      );
    }
  }

  public async before(_data?: any): Promise<any> {
    // lock data in DB with transaction
    const conn = await this.context.mysql.start();

    // validate job ID and check for active jobs
    try {
      this.job = this.workerDefinition.id
        ? await new Job({}, this.context).populateById(
            this.workerDefinition.id,
            conn,
            true, // lock row in DB
          )
        : await new Job({}, this.context).populateByName(
            this.workerDefinition.workerName,
            conn,
            true, // lock row in DB
          );

      // ensure job is in a correct state
      this.shouldRunJob = await this.checkLockedStatus();

      if (!this.shouldRunJob) {
        // console.log('TEST:::::Worker locked!');
        await conn.rollback();
        return;
      }

      // inc executor count and set locked status
      this.job.executorCount = this.job.executorCount
        ? this.job.executorCount + 1
        : 1;
      this.job.status = JobStatus.LOCKED;

      this.workerDefinition = new WorkerDefinition(
        this.workerDefinition.serviceDefinition,
        this.job.name,
        this.job.getWorkerDefinition(),
      );

      await this.job.update(SerializeFor.UPDATE_DB, conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  }
  public async execute(data?: any): Promise<any> {
    if (!this.shouldRunJob) {
      return;
    }
    await this.writeLogToDb(
      WorkerLogStatus.START,
      'Started execution on SINGLE THREAD worker!',
    );

    await this.runExecutor(data ? JSON.parse(data) : null);
  }
  public async onUpdateWorkerDefinition(): Promise<void> {
    if (!this.shouldRunJob) {
      return;
    }
    await this.job.updateWorkerDefinition(this.workerDefinition);
  }
  public async onSuccess(): Promise<any> {
    if (!this.shouldRunJob) {
      await this.writeLogToDb(
        WorkerLogStatus.WARNING,
        'Warning! Job was locked, message discarded!',
      );
      return;
    }
    await this.updateJobState();
    await this.writeLogToDb(WorkerLogStatus.SUCCESS, 'Job completed!');
  }

  public async onError(error: Error): Promise<any> {
    await this.writeLogToDb(WorkerLogStatus.ERROR, 'Error!', null, error);
  }

  public async onAutoRemove(): Promise<any> {
    if (!this.shouldRunJob) {
      return;
    }
    await this.context.mysql.paramExecute(
      `DELETE
       FROM ${DbTables.JOB}
       WHERE id = @id`,
      {
        id: this.workerDefinition.id,
      },
    );
  }

  private async checkLockedStatus(): Promise<boolean> {
    if (!this.job.exists()) {
      await this.fireAlert(SingleThreadWorkerAlertType.MISSING_JOB_DEFINITION);
      return false;
    }

    // console.log(
    //   `${moment().diff(
    //     moment(this.job.lastRun),
    //     'second',
    //   )} seconds since last job run! TIMEOUT=(${this.job.timeout})`,
    // );
    // if past timeout - ignore count and locked status

    if (
      !!this.job.lastRun &&
      !!this.job.timeout &&
      this.job.status === JobStatus.LOCKED &&
      moment().diff(moment(this.job.lastRun), 'second') >= this.job.timeout
    ) {
      this.job.executorCount = 0;
      this.job.lastError = 'TIMEOUT EXCEEDED';
      this.job.lastFailed = this.job.nextRun;
      // console.warn('Warning! Running locked worker because timeout reached.');
      await this.writeLogToDb(
        WorkerLogStatus.WARNING,
        'Warning! Running locked worker because timeout reached.',
      );
      return true;
    }

    if (this.job.executorCount >= 1 || this.job.status === JobStatus.LOCKED) {
      await this.fireAlert(SingleThreadWorkerAlertType.JOB_LOCKED);
      return false;
    }

    return true;
  }

  private async updateJobState() {
    if (!this.job || !this.job.id) {
      return;
    }
    await this.job.reload();
    if (this.job.status === JobStatus.LOCKED) {
      this.job.status = JobStatus.ACTIVE;
    }
    this.job.executorCount = this.job.executorCount
      ? this.job.executorCount - 1
      : 0;
    await this.job.update();
  }

  private async fireAlert(alertType: SingleThreadWorkerAlertType) {
    await this.onAlert(this.job, alertType);
  }
}
