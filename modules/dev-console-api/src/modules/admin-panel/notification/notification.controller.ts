import {
  DefaultUserRole,
  NotificationAdminQueryFilter,
  ValidateFor,
} from '@apillon/lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { DevConsoleApiContext } from '../../../context';
import { ValidationGuard } from '../../../guards/validation.guard';
import { NotificationService } from './notification.service';
import { CreateOrUpdateNotificationDto } from './dtos/create-or-update-notification.dto';

@Controller('admin-panel/notification')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @Validation({ dto: CreateOrUpdateNotificationDto })
  @UseGuards(ValidationGuard)
  async createNotification(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateOrUpdateNotificationDto,
  ) {
    return await this.notificationService.createNotification(context, body);
  }

  @Patch(':id')
  @Validation({ dto: CreateOrUpdateNotificationDto })
  @UseGuards(ValidationGuard)
  async updateNotification(
    @Ctx() context: DevConsoleApiContext,
    @Body() data: CreateOrUpdateNotificationDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.notificationService.updateNotification(id, data, context);
  }

  @Delete(':id')
  async deleteNotification(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.notificationService.deleteNotification(id, context);
  }

  @Get()
  @Validation({
    dto: NotificationAdminQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async getNotifications(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: NotificationAdminQueryFilter,
  ) {
    return await this.notificationService.getNotifications(context, query);
  }
}
