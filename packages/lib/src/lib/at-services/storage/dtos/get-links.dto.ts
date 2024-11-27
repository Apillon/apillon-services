import { stringParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';
import { stringArrayParser } from '../../../parsers';

export class GetLinksDto extends ModelBase {
  @prop({
    parser: { resolver: stringArrayParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public cids: string[];

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public type?: string;
}
