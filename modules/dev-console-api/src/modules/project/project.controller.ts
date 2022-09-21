import { Body, Controller, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Ctx, PermissionLevel, PermissionType, Validation, Permissions } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { Project } from './models/project.model';
import { ProjectService } from './project.service';

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
    console.log('Body ', body);
    return await this.projectService.updateProject(context, id, body);
  }
}
