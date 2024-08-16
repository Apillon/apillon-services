import {
  AttachedServiceType,
  CreateJobDto,
  DefaultApiKeyRole,
  JobQueryFilter,
  SetJobEnvironmentDto,
  UpdateJobDto,
  ValidateFor,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { AcurastService } from './acurast.service';

@Controller('acurast')
export class AcurastController {
  constructor(private readonly acurastService: AcurastService) {}

  @Post('jobs')
  @Validation({ dto: CreateJobDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async createJob(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateJobDto,
  ) {
    return await this.acurastService.createJob(context, body);
  }

  @Get('jobs')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @Validation({ dto: JobQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listJobs(
    @Ctx() context: ApillonApiContext,
    @Query() query: JobQueryFilter,
  ) {
    // return await this.acurastService.listJobs(context, query);
  }

  @Get('jobs/:job_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard)
  async getJob(
    @Ctx() context: ApillonApiContext,
    @Param('job_uuid') uuid: string,
  ) {
    return await this.acurastService.getJob(context, uuid);
  }

  @Post('jobs/:job_uuid/environment')
  @Validation({ dto: SetJobEnvironmentDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async setJobEnvironment(
    @Ctx() context: ApillonApiContext,
    @Body() body: SetJobEnvironmentDto,
    @Param('job_uuid') job_uuid: string,
  ) {
    body.job_uuid = job_uuid;
    return await this.acurastService.setJobEnvironment(context, body);
  }

  @Post('jobs/:job_uuid/message')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard)
  async sendJobMessage(
    @Ctx() context: ApillonApiContext,
    @Body() payload: any,
    @Param('job_uuid') job_uuid: string,
  ) {
    payload = JSON.stringify(payload); // safety
    return await this.acurastService.sendJobMessage(context, payload, job_uuid);
  }

  @Patch('jobs/:job_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @Validation({ dto: UpdateJobDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async updateJob(
    @Ctx() context: ApillonApiContext,
    @Param('job_uuid') job_uuid: string,
    @Body() body: UpdateJobDto,
  ) {
    body.job_uuid = job_uuid;
    return await this.acurastService.updateJob(context, body);
  }

  @Delete('jobs/:job_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard)
  async deleteJob(
    @Ctx() context: ApillonApiContext,
    @Param('job_uuid') job_uuid: string,
  ) {
    return await this.acurastService.deleteJob(context, job_uuid);
  }
}
