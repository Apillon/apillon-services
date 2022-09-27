import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Ctx, PermissionLevel, PermissionType, Validation, Permissions } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { Project } from './models/project.model';
import { ProjectService } from './project.service';
import { ProjectUserFilter } from './dtos/project_user-query-filter.dto';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  @Validation({ dto: Project })
  @UseGuards(ValidationGuard)
  async createProject(@Ctx() context: DevConsoleApiContext, @Body() body: Project) {
    return await this.projectService.createProject(context, body);
  }

  @Patch('/:id')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  async updateProject(@Ctx() context: DevConsoleApiContext, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return await this.projectService.updateProject(context, id, body);
  }

  @Get()
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  async getUserProjects(@Ctx() context: DevConsoleApiContext) {
    return await this.projectService.getUserProjects(context);
  }

  @Get('/:id/getProjectUsers')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  async getProjectUsers(@Ctx() context: DevConsoleApiContext, @Param('id', ParseIntPipe) id: number) {
    return await this.projectService.getProjectUsers(context, id);
  }

  @Post('/:id/inviteUser')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @Validation({ dto: ProjectUserFilter })
  @UseGuards(AuthGuard, ValidationGuard)
  async inviteUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ProjectUserFilter,
  ) {
    return await this.projectService.inviteUserProject(context, id, body);
  }

  @Post('/:id/removeUser')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @Validation({ dto: ProjectUserFilter })
  @UseGuards(AuthGuard, ValidationGuard)
  async removeUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ProjectUserFilter,
  ) {
    return await this.projectService.removeUserProject(context, id, body);
  }
}
