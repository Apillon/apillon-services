import {
  Body,
  Controller,
  Param,
  Query,
  Post,
  Patch,
  Get,
  ParseIntPipe,
  UseGuards,
  Delete,
} from '@nestjs/common';

import { PermissionLevel, PermissionType, ValidateFor } from 'at-lib';
import { Ctx } from '../../decorators/context.decorator';
import { Validation } from '../../decorators/validation.decorator';
import { Permissions } from '../../decorators/permission.decorator';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { ServicesService } from './services.service';
import { Service } from './models/service.model';
import { AuthGuard } from '../../guards/auth.guard';
import { ServiceQueryFilter } from './dtos/services-query-filter.dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly serviceService: ServicesService) {}

  @Get()
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @Validation({ dto: ServiceQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getServiceList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ServiceQueryFilter,
  ) {
    return await this.serviceService.getServiceList(context, query);
  }

  @Get('/:id')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  async getService(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.serviceService.getService(context, id);
  }

  @Post()
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @Validation({ dto: Service })
  @UseGuards(ValidationGuard, AuthGuard)
  async createService(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: Service,
  ) {
    return await this.serviceService.createService(context, body);
  }

  @Patch('/:id')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  async updateService(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.serviceService.updateService(context, id, body);
  }

  @Delete('/:id')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  async deleteService(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.serviceService.deleteService(context, id);
  }
}
