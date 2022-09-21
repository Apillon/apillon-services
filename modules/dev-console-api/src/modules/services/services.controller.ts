import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

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
}
