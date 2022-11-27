import { booleanParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';

export class EndFileUploadSessionDto extends ModelBase {
  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public direct_sync: boolean;
}
