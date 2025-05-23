import { DefaultUserRole } from '@apillon/lib';
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
import { AuthGuard } from '../../guards/auth.guard';
import { ServiceStatusService } from './service-status.service';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { CreateOrUpdateServiceStatusDto } from './dtos/create-or-update-service-status.dto';

@Controller('service-status')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard, ValidationGuard)
export class ServiceStatusController {
  constructor(private readonly serviceStatusService: ServiceStatusService) {}

  @Post()
  @Validation({ dto: CreateOrUpdateServiceStatusDto })
  async createServiceStatus(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateOrUpdateServiceStatusDto,
  ) {
    return await this.serviceStatusService.createServiceStatus(context, body);
  }

  @Patch(':service_status_id')
  @Validation({ dto: CreateOrUpdateServiceStatusDto })
  async updateServiceStatus(
    @Ctx() context: DevConsoleApiContext,
    @Body() data: CreateOrUpdateServiceStatusDto,
    @Param('service_status_id', ParseIntPipe) serviceStatusId: number,
  ) {
    return await this.serviceStatusService.updateServiceStatus(
      { data, serviceStatusId },
      context,
    );
  }
}
