import { Body, Controller, Param, Query, Post, Patch, Get, ParseIntPipe, UseGuards, Delete } from '@nestjs/common';

import { Ctx, PermissionLevel, PermissionType, Validation, Permissions } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { ServicesService } from './services.service';
import { Service } from './models/service.model';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('services')
export class ServicesController {
  constructor(private readonly serviceService: ServicesService) {}

  @Get()
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  async getServiceList(@Ctx() context: DevConsoleApiContext, @Query('type') type: string) {
    return this.serviceService.getServiceList(context, { type: type });
  }

  @Get('/:id')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  async getService(@Ctx() context: DevConsoleApiContext, @Param('id', ParseIntPipe) id: number) {
    return this.serviceService.getService(context, id);
  }

  @Post()
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @Validation({ dto: Service })
  @UseGuards(ValidationGuard, AuthGuard)
  async createService(@Ctx() context: DevConsoleApiContext, @Body() body: Service) {
    return await this.serviceService.createService(context, body);
  }

  @Patch('/:id')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  async updateService(@Ctx() context: DevConsoleApiContext, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.serviceService.updateService(context, id, body);
  }

  @Delete('/:id')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  async deleteService(@Ctx() context: DevConsoleApiContext, @Param('id', ParseIntPipe) id: number) {
    return this.serviceService.deleteService(context, id);
  }
}
