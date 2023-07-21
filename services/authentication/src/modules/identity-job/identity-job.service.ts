import { ServiceContext } from '@apillon/service-lib';
import { AuthenticationValidationException } from '../../lib/exceptions';

import { IdentityJob } from './models/identity-job.model';

export class IdentityJobService {
  public static async createOrGetIdentityJob(
    context: ServiceContext,
    identity_id: number,
    finalState?: string,
    data?: any,
  ) {
    // if this is a retry, return existing
    const identityJob = await new IdentityJob({}, context).populateByIdentityId(
      identity_id,
    );

    return identityJob.exists()
      ? identityJob
      : await new IdentityJob({}, context)
          .populate({
            identity_id: identity_id,
            finalState: finalState,
            data: data,
          })
          .insert();
  }

  public static async insertIdentityJob(job: IdentityJob) {
    try {
      await job.validate();
    } catch (err) {
      await job.handle(err);
      if (!job.isValid()) {
        throw new AuthenticationValidationException(job);
      }
    }
    await job.insert();
  }

  public static async updateIdentityJob(job: IdentityJob) {
    try {
      await job.validate();
    } catch (err) {
      await job.handle(err);
      if (!job.isValid()) {
        throw new AuthenticationValidationException(job);
      }
    }
    await job.update();
  }
}
