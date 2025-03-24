import { DeployEventType } from '../../../config/types';
import { DeployInstanceDto } from './dtos/deploy-instance.dto';
import { GenericDeployRequestDto } from './dtos/generic-deploy-request.dto';
import { ResizeInstanceDto } from './dtos/resize-instance.dto';
import { BackendsQueryFilter } from './dtos/backends-query-filter.dto';
import { TriggerGithubDeployDtoType } from './dtos/trigger-github-deploy.dto';
import { NftWebsiteDeployDtoType } from './dtos/nft-website-deploy.dto';
import { WebsiteDeployDtoType } from '../storage/dtos/website-deploy.dto';
import { CreateDeploymentConfigDtoType } from './dtos/create-deployment-config.dto';
import { UpdateDeploymentConfigDtoType } from './dtos/update-deployment-config.dto';
import { GithubLinkDtoType } from './dtos/github-link.dto';
import { GithubUnlinkDtoType } from './dtos/github-unlink.dto';
import { DeploymentBuildQueryFilter } from './dtos/deployment-build-query-filter.dto';
import { SetEnvironmentVariablesDtoType } from '../storage/dtos/set-environment-variables.dto';
import { GetProjectConfigType } from './types/get-project-config.type';
import { GetDeployConfigByRepoIdType } from './types/get-deploy-config-by-repo-id.type';
import { ListReposType } from './types/list-repos.type';
import { DeleteDeploymentConfigType } from './types/delete-deployment-config.type';
import { GetEnvironmentVariablesType } from './types/get-environment-variables.type';
import { GetDeploymentConfigType } from './types/get-deployment-config.type';

export type DeployMSEventType =
  | IBodyEvent<DeployEventType.BE_DEPLOY_DOCKER_COMPOSE, DeployInstanceDto>
  | IBodyEvent<DeployEventType.BE_LIST_BACKENDS, BackendsQueryFilter>
  | IBodyEvent<DeployEventType.BE_GET_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_GET_INSTANCE_DETAILS, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_START_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_SHUTDOWN_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_STOP_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_RESTART_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_DESTROY_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_RESIZE_INSTANCE, ResizeInstanceDto>
  | IBodyEvent<DeployEventType.BE_GET_INSTANCE_STATE, GenericDeployRequestDto>
  | IBodyEvent<
      DeployEventType.BE_GET_INSTANCE_ATTESTATION,
      GenericDeployRequestDto
    >
  | IBodyEvent<
      DeployEventType.TRIGGER_GITHUB_DEPLOY,
      TriggerGithubDeployDtoType
    >
  | IBodyEvent<
      DeployEventType.TRIGGER_WEB_DEPLOY,
      NftWebsiteDeployDtoType | WebsiteDeployDtoType
    >
  | IBodyEvent<
      DeployEventType.GET_DEPLOY_CONFIG_BY_REPO_ID,
      GetDeployConfigByRepoIdType
    >
  | IBodyEvent<DeployEventType.GET_PROJECT_GITHUB_CONFIG, GetProjectConfigType>
  | IBodyEvent<
      DeployEventType.CREATE_DEPLOY_CONFIG,
      CreateDeploymentConfigDtoType
    >
  | IBodyEvent<
      DeployEventType.UPDATE_DEPLOY_CONFIG,
      {
        id: number;
        body: UpdateDeploymentConfigDtoType;
      }
    >
  | IBodyEvent<DeployEventType.LINK_GITHUB, GithubLinkDtoType>
  | IBodyEvent<DeployEventType.UNLINK_GITHUB, GithubUnlinkDtoType>
  | IBodyEvent<DeployEventType.LIST_REPOS, ListReposType>
  | IBodyEvent<
      DeployEventType.LIST_DEPLOYMENT_BUILDS,
      DeploymentBuildQueryFilter
    >
  | IBodyEvent<
      DeployEventType.DELETE_DEPLOYMENT_CONFIG,
      DeleteDeploymentConfigType
    >
  | IBodyEvent<
      DeployEventType.SET_ENVIRONMENT_VARIABLES,
      SetEnvironmentVariablesDtoType
    >
  | IBodyEvent<
      DeployEventType.GET_ENVIRONMENT_VARIABLES,
      GetEnvironmentVariablesType
    >
  | IBodyEvent<DeployEventType.GET_DEPLOYMENT_CONFIG, GetDeploymentConfigType>;
// | IBodyEvent<
//     DeployEventType.BE_GET_INSTANCE_BILLING,
//     GenericDeployRequestDto
//   >

interface IDeployMSEventBase {
  eventName: DeployEventType;
}

interface IBodyEvent<T extends DeployEventType, U> extends IDeployMSEventBase {
  eventName: T;
  body: U;
}

// interface IQueryEvent<T extends DeployEventType, U>
//   extends IBodyEvent<
//     T,
//     {
//       query: U;
//     }
//   > {
//   eventName: T;
// }

// interface IDeployUuidEvent<T extends DeployEventType>
//   extends IBodyEvent<
//     T,
//     {
//       deploy_uuid: string;
//     }
//   > {}

// interface IProjectUuidEvent<T extends DeployEventType>
//   extends IBodyEvent<T, { project_uuid: string }> {
//   eventName: T;
// }
