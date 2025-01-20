import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  DefaultUserRole,
  NotificationQueryFilter,
  ValidateFor,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('notification')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @Permissions({ role: DefaultUserRole.USER })
  @Validation({ dto: NotificationQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getNotifications(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: NotificationQueryFilter,
  ) {
    return await this.notificationService.getNotificationListForUser(
      context,
      query,
    );
  }
}
