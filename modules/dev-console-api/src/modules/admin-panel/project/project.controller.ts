import {
  DefaultUserRole,
  GetQuotasDto,
  ValidateFor,
  CreateQuotaOverrideDto,
  QuotaOverrideDto,
  PopulateFrom,
  BaseQueryFilter,
  CacheKeyPrefix,
  QuotaType,
} from '@apillon/lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CacheInterceptor,
  Ctx,
  Permissions,
  Validation,
} from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { ProjectService } from './project.service';
import { DevConsoleApiContext } from '../../../context';
import { ValidationGuard } from '../../../guards/validation.guard';
import { QuotaDto } from '@apillon/lib/dist/lib/at-services/config/dtos/quota.dto';
import { UUID } from 'crypto';
import { BaseQueryFilterValidator } from '../../../decorators/base-query-filter-validator';
import { Cache } from '@apillon/modules-lib';

@Controller('admin-panel/projects')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @BaseQueryFilterValidator()
  @Cache({ keyPrefix: CacheKeyPrefix.ADMIN_PROJECT_LIST })
  async listProjects(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseQueryFilter,
  ) {
    return this.projectService.getProjectList(context, query);
  }

  @Get(':project_uuid')
  async getProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
  ) {
    return this.projectService.getProject(context, project_uuid);
  }

  @Get(':project_uuid/quotas')
  @Validation({ dto: GetQuotasDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async getProjectQuotas(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
    @Query() query: GetQuotasDto,
  ): Promise<QuotaDto[]> {
    query.project_uuid = project_uuid;
    query.type = QuotaType.FOR_PROJECT;
    return this.projectService.getProjectQuotas(context, query);
  }

  @Post(':project_uuid/quotas')
  @Validation({
    dto: CreateQuotaOverrideDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async createProjectQuota(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
    @Body() data: CreateQuotaOverrideDto,
  ): Promise<QuotaDto[]> {
    data.project_uuid = project_uuid;
    return this.projectService.createProjectQuota(context, data);
  }

  @Delete(':project_uuid/quotas')
  @Validation({
    dto: QuotaOverrideDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async deleteProjectQuota(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
    @Body() data: QuotaOverrideDto,
  ): Promise<QuotaDto[]> {
    data.project_uuid = project_uuid;
    return this.projectService.deleteProjectQuota(context, data);
  }
}
