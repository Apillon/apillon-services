import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { CreateNotificationDto, Scs } from '@apillon/lib';

@Injectable()
export class NotificationService {
  async createGlobalNotification(
    context: DevConsoleApiContext,
    body: CreateNotificationDto,
  ) {
    return (await new Scs(context).createGlobalNotification(body)).data;
  }
}
