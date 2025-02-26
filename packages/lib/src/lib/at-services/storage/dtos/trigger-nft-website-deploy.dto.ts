import { integerParser, stringParser } from '@rawmodel/parsers';
import { ModelBase, prop } from '../../../base-models/base';
import { NftWebsiteType, PopulateFrom } from '../../../../config/types';

export class TriggerNftWebsiteDeployDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  websiteUuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  apiKey: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  apiSecret: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  contractAddress: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  chainId: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  type: NftWebsiteType;
}
