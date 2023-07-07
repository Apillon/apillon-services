import { ServiceContext } from '@apillon/service-lib';
import { AuthenticationValidationException } from '../../lib/exceptions';

import { IdentityJob } from './models/identity-job.model';

export class IdentityJobService {
  public static async initOrGetIdentityJob(
    context: ServiceContext,
    identity_key: number,
    finalStage?: string,
  ) {
    // if this is a retry, return existingf
    const identityJob = await new IdentityJob(
      {},
      context,
    ).populateByIdentityKey(identity_key);
    return identityJob.exists()
      ? identityJob
      : await new IdentityJob({}, context)
          .populate({
            identity_key: identity_key,
            finalStage: finalStage,
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
