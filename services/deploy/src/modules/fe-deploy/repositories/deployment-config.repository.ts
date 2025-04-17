import { ServiceContext } from '@apillon/service-lib';
import { BaseRepository } from '../../deploy/repositores/base-repository';
import { DeploymentConfig } from '../models/deployment-config.model';

export class DeploymentConfigRepository extends BaseRepository {
  constructor(context: ServiceContext) {
    super(context);
  }

  async getActiveDeploymentConfigByProjectConfigId(projectConfigId: number) {
    return await new DeploymentConfig(
      {},
      this.context,
    ).findActiveByProjectConfig(projectConfigId);
  }

  async getById(id: number) {
    return await new DeploymentConfig({}, this.context).populateById(id);
  }

  async getActiveByWebsiteUuid(websiteUuid: string) {
    return await new DeploymentConfig({}, this.context).findActiveByWebsiteUuid(
      websiteUuid,
    );
  }

  async markDeploymentConfigsDeleted(configIds: number[]) {
    return await new DeploymentConfig({}, this.context).markDeletedByIds(
      configIds,
    );
  }

  async findByRepoId(repoId: number) {
    return await new DeploymentConfig({}, this.context).findByRepoId(repoId);
  }

  create(body: Partial<DeploymentConfig>) {
    return new DeploymentConfig({}, this.context).populate(body);
  }
}
