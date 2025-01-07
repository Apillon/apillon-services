import { integerParser } from '@rawmodel/parsers';
import { NotificationQueryFilter } from './notification-query-filter.dto';
import { prop } from '../../../base-models/base';
import { PopulateFrom } from '../../../../config/types';

export class NotificationAdminQueryFilter extends NotificationQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public userId?: number;
}
