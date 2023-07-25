import {
  CreateIpnsDto,
  DefaultPermission,
  DefaultUserRole,
  IpnsQueryFilter,
  PublishIpnsDto,
  ValidateFor,
} from '@apillon/lib';
import {
  Ctx,
  Permissions,
  ProjectPermissions,
  Validation,
} from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { AuthGuard } from '../../../guards/auth.guard';
import { ValidationGuard } from '../../../guards/validation.guard';
import { IpnsService } from './ipns.service';

@Controller('buckets/:bucket_id/ipns')
@Permissions({ permission: DefaultPermission.STORAGE })
export class IpnsController {
  constructor(private ipnsService: IpnsService) {}

  @Get()
  @ProjectPermissions()
  @Validation({ dto: IpnsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getIpnsList(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_id', ParseIntPipe) bucket_id: number,
    @Query() query: IpnsQueryFilter,
  ) {
    return await this.ipnsService.getIpnsList(context, bucket_id, query);
  }

  @Get(':id')
  @ProjectPermissions()
  @UseGuards(AuthGuard)
  async getIpns(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.ipnsService.getIpns(context, id);
  }

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateIpnsDto })
  @UseGuards(ValidationGuard)
  async createIpnsRecord(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_id', ParseIntPipe) bucket_id: number,
    @Body() body: CreateIpnsDto,
  ) {
    return await this.ipnsService.createIpns(context, bucket_id, body);
  }

  @Patch(':id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateIpns(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.ipnsService.updateIpns(context, id, body);
  }

  @Delete(':id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteIpns(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.ipnsService.deleteIpns(context, id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: PublishIpnsDto, skipValidation: true })
  @UseGuards(ValidationGuard)
  async publishIpns(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PublishIpnsDto,
  ) {
    return await this.ipnsService.publishIpns(context, id, body);
  }
}
