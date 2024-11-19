import { dateParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';
import { presenceValidator } from '../../../validators';
export class IndexerUsageDataQueryFilter extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public indexer_uuid: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.INDEXER_LOGS_REQUIRED_QUERY_DATA_NOT_PRESENT,
      },
    ],
    defaultValue: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      date.setHours(0, 0, 0, 0);
      return date;
    })(),
  })
  public from: Date;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.INDEXER_LOGS_REQUIRED_QUERY_DATA_NOT_PRESENT,
      },
    ],
    defaultValue: new Date(),
  })
  public to: Date;
}
