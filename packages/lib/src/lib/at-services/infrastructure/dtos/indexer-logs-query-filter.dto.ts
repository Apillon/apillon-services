import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';
import { stringArrayParser } from '../../../parsers';
import { presenceValidator } from '../../../validators';
export class IndexerLogsQueryFilter extends ModelBase {
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

  @prop({
    parser: { resolver: stringArrayParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public level: string[];

  @prop({
    parser: { resolver: stringArrayParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public container: string[];

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public nextPage: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    setter(v) {
      return v < 1 ? 100 : v;
    },
    defaultValue: 100,
  })
  public limit: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public search?: string;
}
