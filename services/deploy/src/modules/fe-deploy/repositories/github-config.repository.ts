import { ServiceContext } from '@apillon/service-lib';
import { BaseRepository } from '../../deploy/repositores/base-repository';
import { GithubProjectConfig } from '../models/github-project-config.model';

export class GithubConfigRepository extends BaseRepository {
  constructor(context: ServiceContext) {
    super(context);
  }

  async getGithubProjectConfigByProjectUuid(projectUuid: string) {
    return await new GithubProjectConfig(
      {},
      this.context,
    ).populateByProjectUuid(projectUuid);
  }
}
