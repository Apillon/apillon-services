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
  UseInterceptors,
} from '@nestjs/common';
import {
  BaseQueryFilter,
  CacheKeyPrefix,
  ConfigureCreditDto,
  CreditTransactionQueryFilter,
  DefaultUserRole,
  RoleGroup,
  SerializeFor,
  SubscriptionsQueryFilter,
  ValidateFor,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import {
  CacheByProject,
  CacheInterceptor,
  Ctx,
  Permissions,
  Validation,
} from '@apillon/modules-lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { ProjectUserInviteDto } from './dtos/project_user-invite.dto';
import { ProjectUserUpdateRoleDto } from './dtos/project_user-update-role.dto';
import { Project } from './models/project.model';
import { ProjectService } from './project.service';
import { AuthGuard } from '../../guards/auth.guard';
import { ProjectUserUninviteDto } from './dtos/project_user-uninvite.dto';
import { InvoicesQueryFilter } from '@apillon/lib';
import { ProjectAccessGuard } from '../../guards/project-access.guard';
import { ProjectModifyGuard } from '../../guards/project-modify.guard';

@Controller('projects')
@UseInterceptors(CacheInterceptor)
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

  @Get(':project_uuid/users')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BaseQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard, ProjectAccessGuard)
  async getProjectUsers(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
    @Query() query: BaseQueryFilter,
  ) {
    return await this.projectService.getProjectUsers(
      context,
      project_uuid,
      query,
    );
  }

  @Post(':project_uuid/invite-user')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ProjectUserInviteDto })
  @UseGuards(AuthGuard, ValidationGuard, ProjectModifyGuard)
  async inviteUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
    @Body() body: ProjectUserInviteDto,
  ) {
    return await this.projectService.inviteUserProject(
      context,
      project_uuid,
      body,
    );
  }

  @Post(':project_uuid/uninvite-user')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ProjectUserUninviteDto })
  @UseGuards(AuthGuard, ValidationGuard, ProjectModifyGuard)
  async uninviteUserFromProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
    @Body() body: ProjectUserUninviteDto,
  ) {
    return await this.projectService.uninviteUserFromProject(
      context,
      project_uuid,
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

  @Get(':project_uuid/rpc-plan')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard, ProjectAccessGuard)
  async getProjectRpcPlan(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return await this.projectService.getProjectRpcPlan(context, project_uuid);
  }

  @Get(':project_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard, ProjectAccessGuard)
  async getProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return (
      await this.projectService.getProject(context, project_uuid)
    ).serialize(SerializeFor.PROFILE);
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

  @Patch(':project_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ProjectModifyGuard)
  async updateProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
    @Body() body: any,
  ) {
    return (
      await this.projectService.updateProject(context, project_uuid, body)
    ).serialize(SerializeFor.PROFILE);
  }

  @Get(':project_uuid/overview')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard, ProjectAccessGuard)
  @CacheByProject({ keyPrefix: CacheKeyPrefix.PROJECT_OVERVIEW })
  async getProjectOverview(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return await this.projectService.getProjectOverview(context, project_uuid);
  }
  //#region credits

  @Get(':project_uuid/credit')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard, ProjectAccessGuard)
  async getProjectCredit(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return await this.projectService.getProjectCredit(context, project_uuid);
  }

  @Patch(':project_uuid/credit-settings')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ConfigureCreditDto })
  @UseGuards(AuthGuard, ValidationGuard, ProjectModifyGuard)
  async configureCreditSettings(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
    @Body() body: ConfigureCreditDto,
  ) {
    body.project_uuid = project_uuid;
    return await this.projectService.configureCreditSettings(context, body);
  }

  @Get(':project_uuid/credit/transactions')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: CreditTransactionQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard, ProjectAccessGuard)
  async getCreditTransactions(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
    @Query() query: CreditTransactionQueryFilter,
  ) {
    return await this.projectService.getCreditTransactions(
      context,
      project_uuid,
      query,
    );
  }

  //#endregion

  //#region subscriptions

  @Get(':project_uuid/active-subscription')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard, ProjectAccessGuard)
  async getProjectActiveSubscription(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return await this.projectService.getProjectActiveSubscription(
      context,
      project_uuid,
    );
  }

  @Get(':project_uuid/subscriptions')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: SubscriptionsQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard, ProjectAccessGuard)
  async getProjectSubscriptions(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
    @Query() query: SubscriptionsQueryFilter,
  ) {
    query.project_uuid = project_uuid;
    return await this.projectService.getProjectSubscriptions(context, query);
  }

  @Get(':project_uuid/invoices')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: InvoicesQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard, ProjectAccessGuard)
  async getProjectInvoices(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
    @Query() query: InvoicesQueryFilter,
  ) {
    query.project_uuid = project_uuid;
    return await this.projectService.getProjectInvoices(context, query);
  }

  //#endregion
}
