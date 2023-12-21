import {
  AddCreditDto,
  ApiKeyQueryFilterDto,
  CacheKeyPrefix,
  CreateQuotaOverrideDto,
  DefaultUserRole,
  GetQuotaDto,
  PopulateFrom,
  QuotaDto,
  QuotaOverrideDto,
  QuotaType,
  ValidateFor,
} from '@apillon/lib';
import {
  Cache,
  CacheInterceptor,
  Ctx,
  Permissions,
  Validation,
} from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { DevConsoleApiContext } from '../../../context';
import { AuthGuard } from '../../../guards/auth.guard';
import { ValidationGuard } from '../../../guards/validation.guard';
import { ProjectsQueryFilter } from './dtos/projects-query-filter.dto';
import { ProjectService } from './project.service';

@Controller('admin-panel/projects')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @Validation({
    dto: ProjectsQueryFilter,
    validateFor: ValidateFor.QUERY,
    skipValidation: true,
  })
  @UseGuards(ValidationGuard)
  @Cache({ keyPrefix: CacheKeyPrefix.ADMIN_PROJECT_LIST })
  async listProjects(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ProjectsQueryFilter,
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
  @Validation({
    dto: GetQuotaDto,
    validateFor: ValidateFor.QUERY,
    skipValidation: true,
  })
  @UseGuards(ValidationGuard)
  async getProjectQuotas(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
    @Query() query: GetQuotaDto,
  ): Promise<QuotaDto[]> {
    query.project_uuid = project_uuid;
    query.types = [QuotaType.FOR_PROJECT, QuotaType.FOR_PROJECT_AND_OBJECT];
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

  @Get(':project_uuid/api-keys')
  @Validation({
    dto: ApiKeyQueryFilterDto,
    validateFor: ValidateFor.QUERY,
    populateFrom: PopulateFrom.ADMIN,
    // Skip validation since project_uuuid param comes from URL path, not query
    skipValidation: true,
  })
  @UseGuards(ValidationGuard)
  async getProjectApiKeys(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
    @Query() query: ApiKeyQueryFilterDto,
  ) {
    query.populate({ project_uuid });
    return this.projectService.getProjectApiKeys(context, query);
  }

  @Post(':project_uuid/add-credit')
  @HttpCode(200)
  @Validation({
    dto: AddCreditDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
    skipValidation: true,
  })
  @UseGuards(ValidationGuard)
  async addCreditsToProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
    @Body() data: AddCreditDto,
  ): Promise<any> {
    data.project_uuid = project_uuid;
    return this.projectService.addCreditsToProject(context, data);
  }
}
