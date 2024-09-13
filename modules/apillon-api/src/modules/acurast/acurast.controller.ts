import {
  BaseProjectQueryFilter,
  CreateCloudFunctionDto,
  CreateJobDto,
  DefaultApiKeyRole,
  JobQueryFilter,
  SetCloudFunctionEnvironmentDto,
  ValidateFor,
  AttachedServiceType,
} from '@apillon/lib';
import { Ctx, ApiKeyPermissions, Validation } from '@apillon/modules-lib';
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
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { AcurastService } from './acurast.service';

@Controller('acurast')
export class AcurastController {
  constructor(private readonly acurastService: AcurastService) {}

  @Post('cloud-functions')
  @Validation({ dto: CreateCloudFunctionDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async createCloudFunction(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateCloudFunctionDto,
  ) {
    return await this.acurastService.createCloudFunction(context, body);
  }

  @Get('cloud-functions')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listCloudFunctions(
    @Ctx() context: ApillonApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.acurastService.listCloudFunctions(context, query);
  }

  @Get('cloud-functions/:function_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @Validation({ dto: JobQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getCloudFunction(
    @Ctx() context: ApillonApiContext,
    @Query() query: JobQueryFilter,
    @Param('function_uuid') function_uuid: string,
  ) {
    query.function_uuid = function_uuid;
    return await this.acurastService.getCloudFunction(context, query);
  }

  @Post('cloud-functions/:function_uuid/jobs')
  @Validation({ dto: CreateJobDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async createJob(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateJobDto,
    @Param('function_uuid') function_uuid: string,
  ) {
    body.function_uuid = function_uuid;
    return await this.acurastService.createJob(context, body);
  }

  @Post('cloud-functions/:function_uuid/environment')
  @Validation({ dto: SetCloudFunctionEnvironmentDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async setCloudFunctionEnvironment(
    @Ctx() context: ApillonApiContext,
    @Body() body: SetCloudFunctionEnvironmentDto,
    @Param('function_uuid') function_uuid: string,
  ) {
    body.function_uuid = function_uuid;
    return await this.acurastService.setCloudFunctionEnvironment(context, body);
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
