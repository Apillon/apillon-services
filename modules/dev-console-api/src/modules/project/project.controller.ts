import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DefaultUserRole, ValidateFor } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { Ctx } from '../../decorators/context.decorator';
import { Permissions } from '../../decorators/permission.decorator';
import { Validation } from '../../decorators/validation.decorator';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { File } from '../file/models/file.model';
import { ProjectUserInviteDto } from './dtos/project_user-invite.dto';
import { ProjectUserFilter } from './dtos/project_user-query-filter.dto';
import { ProjectUserUpdateRoleDto } from './dtos/project_user-update-role.dto';
import { Project } from './models/project.model';
import { ProjectService } from './project.service';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('/getProject/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
    { role: DefaultUserRole.ADMIN },
  )
  @UseGuards(AuthGuard)
  async getProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.projectService.getProject(context, id);
  }

  @Post()
  @Permissions({ role: DefaultUserRole.USER }, { role: DefaultUserRole.ADMIN })
  @UseGuards(AuthGuard)
  @Validation({ dto: Project })
  @UseGuards(ValidationGuard)
  async createProject(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: Project,
  ) {
    return await this.projectService.createProject(context, body);
  }

  @Get('/getUserProjects')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getUserProjects(@Ctx() context: DevConsoleApiContext) {
    return await this.projectService.getUserProjects(context);
  }

  @Patch('/updateProject/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.projectService.updateProject(context, id, body);
  }

  @Post('/:project_id/updateProjectImage')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: File })
  @UseGuards(AuthGuard, ValidationGuard)
  async updateProjectImage(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_id', ParseIntPipe) project_id: number,
    @Body() body: File,
  ) {
    return await this.projectService.updateProjectImage(
      context,
      project_id,
      body,
    );
  }

  @Get('/getProjectUsers')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: ProjectUserFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getProjectUsers(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ProjectUserFilter,
  ) {
    return await this.projectService.getProjectUsers(context, query);
  }

  @Post('/inviteUser')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ProjectUserInviteDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async inviteUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ProjectUserInviteDto,
  ) {
    return await this.projectService.inviteUserProject(context, body);
  }

  @Patch('/updateUserRoleOnProject/:project_user_id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ProjectUserUpdateRoleDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async updateUserRoleOnProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_user_id', ParseIntPipe) project_user_id: number,
    @Body() body: ProjectUserUpdateRoleDto,
  ) {
    return await this.projectService.updateUserRoleOnProject(
      context,
      project_user_id,
      body,
    );
  }

  @Delete('/removeUser/:project_user_id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async removeUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_user_id', ParseIntPipe) project_user_id: number,
  ) {
    return await this.projectService.removeUserProject(
      context,
      project_user_id,
    );
  }
}
