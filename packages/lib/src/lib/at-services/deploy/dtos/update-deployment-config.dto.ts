import { prop } from '@rawmodel/core';
import { CreateDeploymentConfigDto } from './create-deployment-config.dto';
import { stringParser } from '@rawmodel/parsers';
import { ModelBaseType } from '../../../base-models/base';

export type UpdateDeploymentConfigDtoType =
  ModelBaseType<UpdateDeploymentConfigDto>;

export class UpdateDeploymentConfigDto extends CreateDeploymentConfigDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [],
    serializable: [],
  })
  public projectUuid: null;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [],
    serializable: [],
  })
  public websiteUuid: null;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [],
    serializable: [],
  })
  public repoUrl: null;
}
