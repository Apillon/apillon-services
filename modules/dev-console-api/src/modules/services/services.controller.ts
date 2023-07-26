import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { DefaultUserRole, SerializeFor, ValidateFor } from '@apillon/lib';
import {
  Ctx,
  Permissions,
  UserAdminPermissions,
  ProjectPermissions,
  Validation,
} from '@apillon/modules-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { ServiceQueryFilter } from './dtos/services-query-filter.dto';
import { ServicesService } from './services.service';
import { ServiceDto } from './dtos/service.dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly serviceService: ServicesService) {}

  @Get('types')
  @UserAdminPermissions()
  @UseGuards(AuthGuard)
  async getServiceTypes(@Ctx() context: DevConsoleApiContext) {
    return await this.serviceService.getServiceTypes(context);
  }

  @Get()
  @ProjectPermissions()
  @Validation({ dto: ServiceQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getServiceList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ServiceQueryFilter,
  ) {
    return await this.serviceService.getServiceList(context, query);
  }

  @Get(':uuid')
  @ProjectPermissions()
  @UseGuards(AuthGuard)
  async getService(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return (await this.serviceService.getService(context, uuid)).serialize(
      SerializeFor.PROFILE,
    );
  }

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ServiceDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createService(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ServiceDto,
  ) {
    return (await this.serviceService.createService(context, body)).serialize(
      SerializeFor.PROFILE,
    );
  }

  @Patch(':uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateService(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Body() body: any,
  ) {
    return (
      await this.serviceService.updateService(context, uuid, body)
    ).serialize(SerializeFor.PROFILE);
  }

  @Delete(':uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteService(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return (await this.serviceService.deleteService(context, uuid)).serialize(
      SerializeFor.PROFILE,
    );
  }
}
