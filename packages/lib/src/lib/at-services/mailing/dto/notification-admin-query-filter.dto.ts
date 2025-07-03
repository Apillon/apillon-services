import { stringParser } from '@rawmodel/parsers';
import { NotificationQueryFilter } from './notification-query-filter.dto';
import { prop } from '../../../base-models/base';
import { PopulateFrom } from '../../../../config/types';

export class NotificationAdminQueryFilter extends NotificationQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public user_uuid?: string;
}
