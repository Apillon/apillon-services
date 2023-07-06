import { PoolConnection, SerializeFor } from '@apillon/lib';
import { AuthenticationValidationException } from '../../lib/exceptions';
import { IdentityJob } from './models/identity-job.model';
import { IDENTITY_JOB_MAX_RETRIES } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class IdentityJobService {
  public static async saveIdentityJob(job: IdentityJob, conn?: PoolConnection) {
    try {
      await job.validate();
    } catch (err) {
      await job.handle(err);
      if (!job.isValid()) {
        throw new AuthenticationValidationException(job);
      }
    }

    await job.insert(SerializeFor.INSERT_DB, conn);
  }

  public static async setCompleted(identityJob: IdentityJob) {
    identityJob.completedAt = new Date();
    await this.saveIdentityJob(identityJob);
  }

  public static async setFailed(identityJob: IdentityJob, error: Error) {
    identityJob.lastError = error.message;
    identityJob.lastFailed = new Date();
    identityJob.retries = ++identityJob.retries;
    await this.saveIdentityJob(identityJob);
  }

  public static async identityJobRetry(
    context: ServiceContext,
    identity_id: number,
  ) {
    const identityJob = await new IdentityJob(
      {},
      context,
    ).populateByIdentityKey(identity_id);
    return identityJob.retries >= IDENTITY_JOB_MAX_RETRIES;
  }
}
