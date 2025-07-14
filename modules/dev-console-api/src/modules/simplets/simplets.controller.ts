import {
  DefaultPermission,
  DefaultUserRole,
  DeployedSimpletsQueryFilterDto,
  RoleGroup,
  SimpletDeployDto,
  SimpletRedeployDto,
  SimpletsQueryFilterDto,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { SimpletsService } from './simplets.service';
import { ProjectModifyGuard } from '../../guards/project-modify.guard';
import { ProjectAccessGuard } from '../../guards/project-access.guard';

const ROUTE_DEPLOYED_PREFIX = '/deployed';
@Controller('simplets')
@Permissions({ permission: DefaultPermission.SIMPLETS })
export class SimpletsController {
  constructor(private readonly simpletsService: SimpletsService) {}

  //#region ------------- DEPLOYED SIMPLETS -------------

  @Post(`${ROUTE_DEPLOYED_PREFIX}/:uuid/redeploy`)
  @Validation({ dto: SimpletRedeployDto })
  @UseGuards(AuthGuard, ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  async redeploy(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') simpletDeploy_uuid: string,
    @Body() body: SimpletRedeployDto,
  ) {
    body.simpletDeploy_uuid = simpletDeploy_uuid;
    return await this.simpletsService.redeploySimplet(context, body);
  }

  @Get(ROUTE_DEPLOYED_PREFIX)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: DeployedSimpletsQueryFilterDto,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listDeployedSimplets(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: DeployedSimpletsQueryFilterDto,
  ) {
    return await this.simpletsService.listDeployedSimplets(context, query);
  }

  @Get(`${ROUTE_DEPLOYED_PREFIX}/:uuid`)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async getDeployedSimplet(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.simpletsService.getDeployedSimplet(context, uuid);
  }

  @Get(`${ROUTE_DEPLOYED_PREFIX}/projects/:project_uuid/quota-reached`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard, ProjectAccessGuard)
  async isBackendQuotaReached(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return await this.simpletsService.isSimpletQuotaReached(
      context,
      project_uuid,
    );
  }

  //#endregion

  //#region ------------- SIMPLETS -------------

  @Get()
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: SimpletsQueryFilterDto,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listSimplets(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: SimpletsQueryFilterDto,
  ) {
    return await this.simpletsService.listSimplets(context, query);
  }

  @Post(':uuid/deploy')
  @Validation({ dto: SimpletDeployDto })
  @UseGuards(AuthGuard, ProjectModifyGuard, ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  async deploy(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') simplet_uuid: string,
    @Body() body: SimpletDeployDto,
  ) {
    body.simplet_uuid = simplet_uuid;
    return await this.simpletsService.deploySimplet(context, body);
  }

  @Get(':uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async getSimplet(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.simpletsService.getSimplet(context, uuid);
  }

  @Delete(`${ROUTE_DEPLOYED_PREFIX}/:uuid`)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteSimpletDeploy(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') simpletDeploy_uuid: string,
  ) {
    return await this.simpletsService.deleteSimpletDeploy(
      context,
      simpletDeploy_uuid,
    );
  }

  @Post(`${ROUTE_DEPLOYED_PREFIX}/:uuid/activate`)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async activateSimpletDeploy(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') simpletDeploy_uuid: string,
  ) {
    return await this.simpletsService.activateSimpletDeploy(
      context,
      simpletDeploy_uuid,
    );
  }

  //#endregion
}
