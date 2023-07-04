import {
  DefaultUserRole,
  GetAllQuotasDto,
  ValidateFor,
  CreateOverrideDto,
  DeleteOverrideDto,
  PopulateFrom,
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
} from '@nestjs/common';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { ProjectService } from './project.service';
import { DevConsoleApiContext } from '../../../context';
import { ProjectQueryFilter } from './dtos/project-query-filter.dto';
import { ValidationGuard } from '../../../guards/validation.guard';
import { QuotaDto } from '@apillon/lib/dist/lib/at-services/config/dtos/quota.dto';
import { UUID } from 'crypto';

@Controller('admin-panel/projects')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @Validation({ dto: ProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async listProjects(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ProjectQueryFilter,
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
  @Validation({ dto: GetAllQuotasDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async getProjectQuotas(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
    @Query() query: GetAllQuotasDto,
  ): Promise<QuotaDto[]> {
    query.project_uuid = project_uuid;
    return this.projectService.getProjectQuotas(context, query);
  }

  @Post(':project_uuid/quotas')
  @Validation({
    dto: CreateOverrideDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async createProjectQuota(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
    @Body() data: CreateOverrideDto,
  ): Promise<QuotaDto[]> {
    data.project_uuid = project_uuid;
    return this.projectService.createProjectQuota(context, data);
  }

  @Delete(':project_uuid/quotas')
  @Validation({
    dto: DeleteOverrideDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async deleteProjectQuota(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid', ParseUUIDPipe) project_uuid: UUID,
    @Body() data: DeleteOverrideDto,
  ): Promise<QuotaDto[]> {
    data.project_uuid = project_uuid;
    return this.projectService.deleteProjectQuota(context, data);
  }
}
