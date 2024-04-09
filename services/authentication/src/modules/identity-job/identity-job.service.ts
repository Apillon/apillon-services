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
          .populate({ identity_id, finalState, data })
          .insert();
  }

  public static async insertIdentityJob(job: IdentityJob) {
    await job.validateOrThrow(AuthenticationValidationException);
    await job.insert();
  }

  public static async updateIdentityJob(job: IdentityJob) {
    await job.validateOrThrow(AuthenticationValidationException);
    await job.update();
  }
}
