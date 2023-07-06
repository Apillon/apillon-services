import { ServiceContext } from '@apillon/service-lib';

import { IDENTITY_JOB_MAX_RETRIES, IdentityJobStage } from '../../config/types';
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

  public static async setCompleted(context, identity_key: number) {
    const identityJob = await new IdentityJob(
      {},
      context,
    ).populateByIdentityKey(identity_key);

    identityJob.completedAt = new Date();
    await this.updateIdentityJob(identityJob);
  }

  public static async setCurrentStage(
    context,
    identity_key: number,
    stage: IdentityJobStage,
  ) {
    const identityJob = await new IdentityJob(
      {},
      context,
    ).populateByIdentityKey(identity_key);

    identityJob.currentStage = stage;
    // Reset retries, since the stage was successfully completed
    identityJob.retries = 0;
    await this.updateIdentityJob(identityJob);
  }

  public static async isFinalStage(context, identity_key: number) {
    const identityJob = await new IdentityJob(
      {},
      context,
    ).populateByIdentityKey(identity_key);

    return identityJob.currentStage === identityJob.finalStage;
  }

  public static async setFailed(context: ServiceContext, identity_key: number) {
    const identityJob = await new IdentityJob(
      {},
      context,
    ).populateByIdentityKey(identity_key);

    identityJob.lastFailed = new Date();
    identityJob.retries = identityJob.retries ? ++identityJob.retries : 1;
    await this.updateIdentityJob(identityJob);
  }

  public static async identityJobRetry(
    context: ServiceContext,
    identity_key: number,
  ) {
    const identityJob = await new IdentityJob(
      {},
      context,
    ).populateByIdentityKey(identity_key);

    return (
      identityJob.retries === null ||
      identityJob.retries <= IDENTITY_JOB_MAX_RETRIES
    );
  }
}
