import { arrayParser, integerParser, stringParser } from '@rawmodel/parsers';
import { ModelBase, ModelBaseType, prop } from '../../../base-models/base';
import { PopulateFrom } from '../../../../config/types';

export type SetEnvironmentVariablesDtoType =
  ModelBaseType<SetEnvironmentVariablesDto>;
export class SetEnvironmentVariablesDto extends ModelBase {
  @prop({
    parser: { resolver: arrayParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public variables?: EnvironmentVariable[];

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public deploymentConfigId: number;
}

export class EnvironmentVariable {
  @prop({
    parser: { resolver: stringParser() },
  })
  public key: string;

  @prop({
    parser: { resolver: stringParser() },
  })
  public value: string;
}
