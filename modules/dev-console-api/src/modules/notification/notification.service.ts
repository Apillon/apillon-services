import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { Mailing, NotificationQueryFilter } from '@apillon/lib';

@Injectable()
export class NotificationService {
  async getNotificationList(
    context: DevConsoleApiContext,
    query: NotificationQueryFilter,
  ) {
    return (await new Mailing(context).getNotificationList(query)).data;
  }
}
