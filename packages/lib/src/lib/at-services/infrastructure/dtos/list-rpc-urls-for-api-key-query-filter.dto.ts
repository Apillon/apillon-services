import { integerParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';
import { prop } from '../../../base-models/base';
export class ListRpcUrlsForApiKeyQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public apiKeyId: number;
}
