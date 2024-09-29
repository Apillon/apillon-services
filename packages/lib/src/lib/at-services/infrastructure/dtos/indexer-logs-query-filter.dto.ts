import { dateParser, integerParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';
import { presenceValidator } from '../../../validators';
import { prop } from '../../../base-models/base';
export class IndexerLogsQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.INDEXER_LOGS_REQUIRED_QUERY_DATA_NOT_PRESENT,
      },
    ],
    defaultValue: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  })
  public from: Date;
}
