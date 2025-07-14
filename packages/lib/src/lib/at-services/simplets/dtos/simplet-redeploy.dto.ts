import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';

/**
 * Represents the data transfer object for Simplet redeploy request.
 */
export class SimpletRedeployDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public simpletDeploy_uuid: string;
}
