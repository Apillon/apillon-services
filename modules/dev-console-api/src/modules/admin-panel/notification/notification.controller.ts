import { CreateNotificationDto, DefaultUserRole } from '@apillon/lib';
import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { DevConsoleApiContext } from '../../../context';
import { ValidationGuard } from '../../../guards/validation.guard';
import { NotificationService } from './notification.service';

@Controller('notification')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard, ValidationGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @Validation({ dto: CreateNotificationDto })
  async createGlobalNotification(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateNotificationDto,
  ) {
    return await this.notificationService.createGlobalNotification(
      context,
      body,
    );
  }
}
