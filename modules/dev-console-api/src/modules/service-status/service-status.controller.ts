import { DefaultUserRole, ValidateFor } from '@apillon/lib';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../guards/auth.guard';
import { ServiceStatusService } from './service-status.service';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { CreateOrUpdateServiceStatusDto } from './dtos/create-or-update-service-status.dto';

@Controller('service-status')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class ServiceStatusController {
  constructor(private readonly serviceStatusService: ServiceStatusService) {}

  @Post()
  @Validation({ dto: CreateOrUpdateServiceStatusDto })
  @UseGuards(ValidationGuard)
  async createServiceStatus(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateOrUpdateServiceStatusDto,
  ) {
    return await this.serviceStatusService.createServiceStatus(context, body);
  }

  @Patch(':service_status_id')
  @Validation({ dto: CreateOrUpdateServiceStatusDto })
  @UseGuards(ValidationGuard)
  async updateServiceStatus(
    @Ctx() context: DevConsoleApiContext,
    @Body() data: CreateOrUpdateServiceStatusDto,
    @Param('service_status_id', ParseIntPipe) serviceStatusId: number,
  ) {
    return await this.serviceStatusService.updateServiceStatus(
      {
        data,
        serviceStatusId: serviceStatusId,
      },
      context,
    );
  }
}
