import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { NotificationQueryFilter, Scs } from '@apillon/lib';

@Injectable()
export class NotificationService {
  async getNotificationList(
    context: DevConsoleApiContext,
    query: NotificationQueryFilter,
  ) {
    return (await new Scs(context).getNotificationList(query)).data;
  }
}
