import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  Ctx,
  PermissionLevel,
  PermissionType,
  Validation,
  Permissions,
  ValidateFor,
} from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { Project } from './models/project.model';
import { ProjectService } from './project.service';
<<<<<<< HEAD
import { FileService } from '../file/file.service';
import { File } from '../file/models/file.model';
=======
import { ProjectUserFilter } from './dtos/project_user-query-filter.dto';
import { ProjectUserInviteDto } from './dtos/project_user-invite.dto';
>>>>>>> develop

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: Project })
  @UseGuards(ValidationGuard)
  async createProject(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: Project,
  ) {
    return await this.projectService.createProject(context, body);
  }

  @Patch('/:id')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  async updateProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.projectService.updateProject(context, id, body);
  }

  @Get()
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  async getUserProjects(@Ctx() context: DevConsoleApiContext) {
    return await this.projectService.getUserProjects(context);
  }

<<<<<<< HEAD
  @Post('/:project_id/updateProjectImage')
=======
  @Get('/getProjectUsers')
>>>>>>> develop
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
<<<<<<< HEAD
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
=======
  @Validation({ dto: ProjectUserFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getProjectUsers(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ProjectUserFilter,
  ) {
    return await this.projectService.getProjectUsers(context, query);
  }

  @Post('/inviteUser')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @Validation({ dto: ProjectUserInviteDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async inviteUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ProjectUserInviteDto,
  ) {
    return await this.projectService.inviteUserProject(context, body);
  }

  @Delete('/:project_user_id/removeUser')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  async removeUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_user_id', ParseIntPipe) project_user_id: number,
  ) {
    return await this.projectService.removeUserProject(
      context,
      project_user_id,
>>>>>>> develop
    );
  }
}
