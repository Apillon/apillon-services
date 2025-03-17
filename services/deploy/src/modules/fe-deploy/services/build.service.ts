import { DeploymentBuildQueryFilter, StorageMicroservice } from '@apillon/lib';
import { DeploymentBuildRepository } from '../repositories/deployment-build.repository';

export class BuildService {
  constructor(
    private readonly deploymentBuildRepository: DeploymentBuildRepository,
    private readonly storageMicroservice: StorageMicroservice,
  ) {}

  async listDeploymentBuildsForWebsite(body: DeploymentBuildQueryFilter) {
    await this.storageMicroservice.getWebsiteWithAccess(
      body.websiteUuid,
      false,
    );
    return await this.deploymentBuildRepository.listForWebsite(body);
  }
}
