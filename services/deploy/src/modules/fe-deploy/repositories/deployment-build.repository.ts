import { ServiceContext } from '@apillon/service-lib';
import { BaseRepository } from '../../deploy/repositores/base-repository';
import { DeploymentConfig } from '../models/deployment-config.model';
import {
  DeploymentBuildQueryFilter,
  DeploymentBuildStatus,
} from '@apillon/lib';
import { DeploymentBuild } from '../models/deployment-build.model';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { BuildProjectWorkerInterface } from '../../../lib/interfaces/build-project-worker.interface';
import { WorkerName } from '../../../workers/builder-executor';
import { BuildProjectWorker } from '../../../workers/build-project-worker';
import { GithubService } from '../services/github.service';

export class DeploymentBuildRepository extends BaseRepository {
  constructor(context: ServiceContext) {
    super(context);
  }

  async listForWebsite(body: DeploymentBuildQueryFilter) {
    return await new DeploymentBuild({}, this.context).listForWebsite(
      new DeploymentBuildQueryFilter(body, this.context),
    );
  }

  create(body: { configId?: number; websiteUuid: string }) {
    return new DeploymentBuild({}, this.context).populate({
      buildStatus: DeploymentBuildStatus.PENDING,
      websiteUuid: body.websiteUuid,
      deploymentConfigId: body.configId,
    });
  }

  async executeBuildProjectWorkerLocally(
    parameters: BuildProjectWorkerInterface,
    githubService: GithubService,
  ) {
    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const wd = new WorkerDefinition(
      serviceDef,
      WorkerName.BUILD_PROJECT_WORKER,
      {
        parameters,
      },
    );

    const builderWorker = new BuildProjectWorker(
      wd,
      this.context,
      QueueWorkerType.EXECUTOR,
      githubService,
    );
    await builderWorker.runExecutor(parameters);
  }
}
