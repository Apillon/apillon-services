import {
  DefaultPermission,
  DefaultUserRole,
  RoleGroup,
  SimpletDeployDto,
  SimpletsQueryFilterDto,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
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

@Controller('simplets')
@Permissions({ permission: DefaultPermission.SIMPLETS })
export class SimpletsController {
  constructor(private readonly simpletsService: SimpletsService) {}

  //#region ------------- DEPLOYED SIMPLETS -------------

  @Get('/deployed')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: SimpletsQueryFilterDto,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listDeployedSimplets(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: SimpletsQueryFilterDto,
  ) {
    return await this.simpletsService.listDeployedSimplets(context, query);
  }

  @Get('/deployed/:uuid')
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

  //#endregion

  //#region ------------- SIMPLETS -------------

  @Get()
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: SimpletsQueryFilterDto,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listDeployedContracts(
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
  async getDeployedContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.simpletsService.getSimplet(context, uuid);
  }

  //#endregion
}
