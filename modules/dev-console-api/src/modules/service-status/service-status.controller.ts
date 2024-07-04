import { DefaultUserRole } from '@apillon/lib';
import {
  Body,
  Controller,
  Get,
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
import { CreateServiceStatusDto } from './dtos/create-service-status.dto';
import { UpdateServiceStatusDto } from './dtos/update-service-status.dto';

@Controller('service-status')
export class ServiceStatusController {
  constructor(private readonly serviceStatusService: ServiceStatusService) {}

  @Get('')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getServiceStatuses(@Ctx() context: DevConsoleApiContext) {
    return await this.serviceStatusService.getServiceStatusList(context);
  }

  @Post()
  @Permissions({
    role: DefaultUserRole.ADMIN,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateServiceStatusDto })
  @UseGuards(ValidationGuard)
  async createServiceStatus(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateServiceStatusDto,
  ) {
    return await this.serviceStatusService.createServiceStatus(context, body);
  }

  @Patch(':service_status_id')
  @Permissions({
    role: DefaultUserRole.ADMIN,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: UpdateServiceStatusDto })
  @UseGuards(ValidationGuard)
  async updateServiceStatus(
    @Ctx() context: DevConsoleApiContext,
    @Body() data: UpdateServiceStatusDto,
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
