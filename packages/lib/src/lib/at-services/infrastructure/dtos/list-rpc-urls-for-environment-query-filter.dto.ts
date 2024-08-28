import { integerParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';
import { presenceValidator } from '../../../validators';
import { prop } from '../../../base-models/base';
export class ListRpcUrlsForEnvironmentQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.RPC_URL_ENVIRONMENT_ID_NOT_PRESENT,
      },
    ],
  })
  public environmentId: number;
}
