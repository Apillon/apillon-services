import { DefaultUserRole, ValidateFor } from '@apillon/lib';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { ProjectService } from './project.service';
import { DevConsoleApiContext } from '../../../context';
import { ProjectQueryFilter } from './dtos/project-query-filter.dto';
import { ValidationGuard } from '../../../guards/validation.guard';

@Controller('admin-panel/projects')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @Validation({ dto: ProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listProjects(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ProjectQueryFilter,
  ) {
    return this.projectService.getProjectList(context, query);
  }

  @Get(':project_uuid')
  async getProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return this.projectService.getProject(context, project_uuid);
  }

  @Get(':project_uuid/qoutas')
  async getProjectQuotas(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return []; // TODO
  }
}
