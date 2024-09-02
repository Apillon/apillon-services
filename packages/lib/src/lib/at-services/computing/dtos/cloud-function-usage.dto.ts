import { ModelBase, prop } from '../../../base-models/base';
import { booleanParser, dateParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';

export class CloudFunctionUsageDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public function_uuid: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public dateFrom: Date;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public dateTo: Date;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public success: boolean;
}
