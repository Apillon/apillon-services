import { prop } from '@rawmodel/core';
import { CreateDeploymentConfigDto } from './create-deployment-config.dto';
import { stringParser } from '@rawmodel/parsers';

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
}
