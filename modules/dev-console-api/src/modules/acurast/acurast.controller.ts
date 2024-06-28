import {
  CreateJobDto,
  DefaultPermission,
  DefaultUserRole,
  JobQueryFilter,
  RoleGroup,
  SetJobEnvironmentDto,
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

  @Get('jobs')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: JobQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listJobs(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: JobQueryFilter,
  ) {
    return await this.acurastService.listJobs(context, query);
  }

  @Get('jobs/:job_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getJob(
    @Ctx() context: DevConsoleApiContext,
    @Param('job_uuid') uuid: string,
  ) {
    return await this.acurastService.getJob(context, uuid);
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

  @Post('jobs/:job_uuid/message')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async sendJobMessage(
    @Ctx() context: DevConsoleApiContext,
    @Body() payload: any,
    @Param('job_uuid') job_uuid: string,
  ) {
    payload = JSON.stringify(payload); // safety
    return await this.acurastService.sendJobMessage(context, payload, job_uuid);
  }

  @Delete('jobs/:job_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteJob(
    @Ctx() context: DevConsoleApiContext,
    @Param('job_uuid') job_uuid: string,
  ) {
    return await this.acurastService.deleteJob(context, job_uuid);
  }
}
