import {
  CreateJobDto,
  DefaultPermission,
  DefaultUserRole,
  SetJobEnvironmentDto,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { AcurastService } from './acurast.service';

@Controller('acurast')
@Permissions({ permission: DefaultPermission.COMPUTING })
export class AcurastController {
  constructor(private readonly acurastService: AcurastService) {}

  @Post('jobs')
  @Validation({ dto: CreateJobDto })
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ValidationGuard)
  async createJob(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateJobDto,
  ) {
    return await this.acurastService.createJob(context, body);
  }

  @Post('jobs/:job_uuid/environment')
  @Validation({ dto: SetJobEnvironmentDto })
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ValidationGuard)
  async setJobEnvironment(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: SetJobEnvironmentDto,
    @Param('job_uuid') job_uuid: string,
  ) {
    body.job_uuid = job_uuid;
    return await this.acurastService.setJobEnvironment(context, body);
  }
  // @Get('jobs')
  // @Permissions({ role: RoleGroup.ProjectAccess })
  // @Validation({ dto: ContractQueryFilter, validateFor: ValidateFor.QUERY })
  // @UseGuards(AuthGuard, ValidationGuard)
  // async listAcurastContracts(
  //   @Ctx() context: DevConsoleApiContext,
  //   @Query() query: ContractQueryFilter,
  // ) {
  //   return await this.acurastService.listContracts(context, query);
  // }

  // @Get('jobs/:uuid')
  // @Permissions({ role: RoleGroup.ProjectAccess })
  // @UseGuards(AuthGuard)
  // async getContract(
  //   @Ctx() context: DevConsoleApiContext,
  //   @Param('uuid') uuid: string,
  // ) {
  //   return await this.acurastService.getContract(context, uuid);
  // }
}
