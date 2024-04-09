import {
  CreateIpnsDto,
  DefaultPermission,
  DefaultUserRole,
  IpnsQueryFilter,
  PublishIpnsDto,
  RoleGroup,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { AuthGuard } from '../../../guards/auth.guard';
import { ValidationGuard } from '../../../guards/validation.guard';
import { IpnsService } from './ipns.service';

@Controller('buckets/:bucket_uuid/ipns')
@Permissions({ permission: DefaultPermission.STORAGE })
export class IpnsController {
  constructor(private ipnsService: IpnsService) {}

  @Get()
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: IpnsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getIpnsList(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Query() query: IpnsQueryFilter,
  ) {
    return await this.ipnsService.getIpnsList(context, bucket_uuid, query);
  }

  @Get(':ipns_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getIpns(
    @Ctx() context: DevConsoleApiContext,
    @Param('ipns_uuid') ipns_uuid: string,
  ) {
    return await this.ipnsService.getIpns(context, ipns_uuid);
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
    @Param('bucket_uuid') bucket_uuid: string,
    @Body() body: CreateIpnsDto,
  ) {
    return await this.ipnsService.createIpns(context, bucket_uuid, body);
  }

  @Patch(':ipns_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateIpns(
    @Ctx() context: DevConsoleApiContext,
    @Param('ipns_uuid') ipns_uuid: string,
    @Body() body: any,
  ) {
    return await this.ipnsService.updateIpns(context, ipns_uuid, body);
  }

  @Delete(':ipns_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteIpns(
    @Ctx() context: DevConsoleApiContext,
    @Param('ipns_uuid') ipns_uuid: string,
  ) {
    return await this.ipnsService.deleteIpns(context, ipns_uuid);
  }

  @Post(':ipns_uuid/publish')
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
    @Param('ipns_uuid') ipns_uuid: string,
    @Body() body: PublishIpnsDto,
  ) {
    return await this.ipnsService.publishIpns(context, ipns_uuid, body);
  }
}
