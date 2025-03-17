import { DeployEventType } from '../../../config/types';
import { DeployInstanceDto } from './dtos/deploy-instance.dto';
import { GenericDeployRequestDto } from './dtos/generic-deploy-request.dto';
import { ResizeInstanceDto } from './dtos/resize-instance.dto';
import { BackendsQueryFilter } from './dtos/backends-query-filter.dto';
import { TriggerGithubDeployDto } from './dtos/trigger-github-deploy.dto';
import { NftWebsiteDeployDto } from './dtos/nft-website-deploy.dto';
import { WebsiteDeployDto } from '../storage/dtos/website-deploy.dto';
import { CreateDeploymentConfigDto } from './dtos/create-deployment-config.dto';
import { UpdateDeploymentConfigDto } from './dtos/update-deployment-config.dto';
import { GithubLinkDto } from './dtos/github-link.dto';
import { GithubUnlinkDto } from './dtos/github-unlink.dto';
import { DeploymentBuildQueryFilter } from './dtos/deployment-build-query-filter.dto';
import { SetEnvironmentVariablesDto } from '../storage/dtos/set-environment-variables.dto';

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
  | IBodyEvent<DeployEventType.TRIGGER_GITHUB_DEPLOY, TriggerGithubDeployDto>
  | IBodyEvent<
      DeployEventType.TRIGGER_WEB_DEPLOY,
      NftWebsiteDeployDto | WebsiteDeployDto
    >
  | IBodyEvent<DeployEventType.GET_DEPLOY_CONFIG_BY_REPO_ID, number>
  | IBodyEvent<DeployEventType.GET_PROJECT_GITHUB_CONFIG, string>
  | IBodyEvent<DeployEventType.CREATE_DEPLOY_CONFIG, CreateDeploymentConfigDto>
  | IBodyEvent<
      DeployEventType.UPDATE_DEPLOY_CONFIG,
      {
        id: number;
        body: UpdateDeploymentConfigDto;
      }
    >
  | IBodyEvent<DeployEventType.LINK_GITHUB, GithubLinkDto>
  | IBodyEvent<DeployEventType.UNLINK_GITHUB, GithubUnlinkDto>
  | IBodyEvent<DeployEventType.LIST_REPOS, string>
  | IBodyEvent<
      DeployEventType.LIST_DEPLOYMENT_BUILDS,
      DeploymentBuildQueryFilter
    >
  | IBodyEvent<DeployEventType.DELETE_DEPLOYMENT_CONFIG, string>
  | IBodyEvent<
      DeployEventType.SET_ENVIRONMENT_VARIABLES,
      SetEnvironmentVariablesDto
    >
  | IBodyEvent<DeployEventType.GET_ENVIRONMENT_VARIABLES, number>
  | IBodyEvent<DeployEventType.GET_DEPLOYMENT_CONFIG, string>;
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
