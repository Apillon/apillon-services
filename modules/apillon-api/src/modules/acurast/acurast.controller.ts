import {
  BaseProjectQueryFilter,
  CloudFunctionUsageDto,
  CreateCloudFunctionDto,
  CreateJobDto,
  DefaultApiKeyRole,
  JobQueryFilter,
  RoleGroup,
  SetCloudFunctionEnvironmentDto,
  UpdateCloudFunctionDto,
  UpdateJobDto,
  ValidateFor,
  AttachedServiceType,
} from '@apillon/lib';
import { Ctx, ApiKeyPermissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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

  @Post('cloud-functions/:function_uuid/execute')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async executeCloudFunction(
    @Ctx() context: ApillonApiContext,
    @Body() payload: any,
    @Param('function_uuid') function_uuid: string,
  ) {
    payload = JSON.stringify(payload); // safety
    return await this.acurastService.executeCloudFunction(
      context,
      payload,
      function_uuid,
    );
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

  @Get('cloud-functions/:function_uuid/environment')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @Validation({ dto: SetCloudFunctionEnvironmentDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async getCloudFunctionEnvironment(
    @Ctx() context: ApillonApiContext,
    @Param('function_uuid') function_uuid: string,
  ) {
    return await this.acurastService.getCloudFunctionEnvironment(
      context,
      function_uuid,
    );
  }

  @Get('cloud-functions/:function_uuid/usage')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @Validation({ dto: CloudFunctionUsageDto, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getCloudFunctionUsage(
    @Param('function_uuid') function_uuid: string,
    @Query() query: CloudFunctionUsageDto,
  ) {
    query.function_uuid = function_uuid;
    return await this.acurastService.getCloudFunctionUsage(query);
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
