import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  Ctx,
  PermissionLevel,
  PermissionType,
  Validation,
  Permissions,
} from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { Project } from './models/project.model';
import { ProjectService } from './project.service';
import { FileService } from '../file/file.service';
import { File } from '../file/models/file.model';

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

  @Post('/:project_id/updateProjectImage')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @Validation({ dto: File })
  @UseGuards(AuthGuard, ValidationGuard)
  async updateProjectImage(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_id', ParseIntPipe) project_id: number,
    @Body() body: File,
  ) {
    return await this.projectService.updateProjectImage(context, body);
  }
}
