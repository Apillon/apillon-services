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
import {
  DefaultUserRole,
  RoleGroup,
  SerializeFor,
  SubscriptionsQueryFilter,
  ValidateFor,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { File } from '../file/models/file.model';
import { ProjectUserInviteDto } from './dtos/project_user-invite.dto';
import { ProjectUserFilter } from './dtos/project_user-query-filter.dto';
import { ProjectUserUpdateRoleDto } from './dtos/project_user-update-role.dto';
import { Project } from './models/project.model';
import { ProjectService } from './project.service';
import { AuthGuard } from '../../guards/auth.guard';
import { ProjectUserUninviteDto } from './dtos/project_user-uninvite.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('user-projects')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getUserProjects(@Ctx() context: DevConsoleApiContext) {
    return await this.projectService.getUserProjects(context);
  }

  @Get('qouta-reached')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async isProjectsQuotaReached(@Ctx() context: DevConsoleApiContext) {
    return await this.projectService.isProjectsQuotaReached(context);
  }

  @Post(':uuid/image')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: File })
  @UseGuards(AuthGuard, ValidationGuard)
  async updateProjectImage(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Body() body: File,
  ) {
    return await this.projectService.updateProjectImage(context, uuid, body);
  }

  @Get(':uuid/users')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: ProjectUserFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getProjectUsers(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Query() query: ProjectUserFilter,
  ) {
    return await this.projectService.getProjectUsers(context, uuid, query);
  }

  @Post(':uuid/invite-user')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ProjectUserInviteDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async inviteUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Body() body: ProjectUserInviteDto,
  ) {
    return await this.projectService.inviteUserProject(context, uuid, body);
  }

  @Post(':uuid/uninvite-user')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ProjectUserUninviteDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async uninviteUserFromProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Body() body: ProjectUserUninviteDto,
  ) {
    return await this.projectService.uninviteUserFromProject(
      context,
      uuid,
      body,
    );
  }

  @Patch('user/:projectUserId')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ProjectUserUpdateRoleDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async updateUserRoleOnProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('projectUserId', ParseIntPipe) projectUserId: number,
    @Body() body: ProjectUserUpdateRoleDto,
  ) {
    return await this.projectService.updateUserRoleOnProject(
      context,
      projectUserId,
      body,
    );
  }

  @Delete('user/:projectUserId')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async removeUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('projectUserId', ParseIntPipe) projectUserId: number,
  ) {
    return await this.projectService.removeUserProject(context, projectUserId);
  }

  @Get(':uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return (await this.projectService.getProject(context, uuid)).serialize(
      SerializeFor.PROFILE,
    );
  }

  @Post()
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  @Validation({ dto: Project })
  @UseGuards(ValidationGuard)
  async createProject(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: Project,
  ) {
    return (await this.projectService.createProject(context, body)).serialize(
      SerializeFor.PROFILE,
    );
  }

  @Patch(':uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Body() body: any,
  ) {
    return (
      await this.projectService.updateProject(context, uuid, body)
    ).serialize(SerializeFor.PROFILE);
  }

  @Get(':uuid/subscriptions')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: SubscriptionsQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async getProjectSubscriptions(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') project_uuid: string,
    @Query() query: SubscriptionsQueryFilter,
  ) {
    query.project_uuid = project_uuid;
    return await this.projectService.getProjectSubscriptions(context, query);
  }
}
