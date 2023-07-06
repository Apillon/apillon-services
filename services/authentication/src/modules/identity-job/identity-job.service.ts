import { PoolConnection, SerializeFor } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';

import { IDENTITY_JOB_MAX_RETRIES } from '../../config/types';
import { AuthenticationValidationException } from '../../lib/exceptions';

import { IdentityJob } from './models/identity-job.model';

export class IdentityJobService {
  public static async initIdentityJob(
    context: ServiceContext,
    identity_key: number,
  ) {
    return await new IdentityJob({}, context)
      .populate({
        identity_key: identity_key,
      })
      .insert();
  }

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
    identity_key: number,
  ) {
    const identityJob = await new IdentityJob(
      {},
      context,
    ).populateByIdentityKey(identity_key);
    return identityJob.retries >= IDENTITY_JOB_MAX_RETRIES;
  }
}
