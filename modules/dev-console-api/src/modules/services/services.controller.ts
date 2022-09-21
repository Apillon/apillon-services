import { Body, Controller, Param, Post, Patch, Get, ParseIntPipe, UseGuards } from '@nestjs/common';

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
  getHello(): string {
    return 'Service Hello!';
  }

  @Post()
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @Validation({ dto: Service })
  @UseGuards(ValidationGuard, AuthGuard)
  async createService(@Ctx() context: DevConsoleApiContext, @Body() body: Service) {
    return await this.serviceService.createService(context, body);
  }

  @Patch('/:id')
  @Permissions({})
  @UseGuards(AuthGuard)
  async updateService(@Ctx() context: DevConsoleApiContext, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    console.log('Body ', body);
    return this.serviceService.updateService(context, id, body);
  }
}
