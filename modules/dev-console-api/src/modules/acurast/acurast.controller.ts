import {
  BaseProjectQueryFilter,
  CloudFunctionUsageDto,
  CreateCloudFunctionDto,
  CreateJobDto,
  DefaultPermission,
  DefaultUserRole,
  JobQueryFilter,
  RoleGroup,
  SetCloudFunctionEnvironmentDto,
  UpdateCloudFunctionDto,
  UpdateJobDto,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
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
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { AcurastService } from './acurast.service';

@Controller('acurast')
@Permissions({ permission: DefaultPermission.COMPUTING })
export class AcurastController {
  constructor(private readonly acurastService: AcurastService) {}

  @Post('cloud-functions')
  @Validation({ dto: CreateCloudFunctionDto })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard, ValidationGuard)
  async createCloudFunction(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateCloudFunctionDto,
  ) {
    return await this.acurastService.createCloudFunction(context, body);
  }

  @Get('cloud-functions')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listCloudFunctions(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.acurastService.listCloudFunctions(context, query);
  }

  @Get('cloud-functions/:function_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: JobQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getCloudFunction(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: JobQueryFilter,
    @Param('function_uuid') function_uuid: string,
  ) {
    query.function_uuid = function_uuid;
    return await this.acurastService.getCloudFunction(context, query);
  }

  @Patch('cloud-functions/:function_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: UpdateCloudFunctionDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async updateCloudFunction(
    @Ctx() context: DevConsoleApiContext,
    @Param('function_uuid') function_uuid: string,
    @Body() body: UpdateCloudFunctionDto,
  ) {
    body.function_uuid = function_uuid;
    return await this.acurastService.updateCloudFunction(context, body);
  }

  @Post('cloud-functions/:function_uuid/jobs')
  @Validation({ dto: CreateJobDto })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard, ValidationGuard)
  async createJob(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateJobDto,
    @Param('function_uuid') function_uuid: string,
  ) {
    body.function_uuid = function_uuid;
    return await this.acurastService.createJob(context, body);
  }

  @Post('cloud-functions/:function_uuid/execute')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async executeCloudFunction(
    @Ctx() context: DevConsoleApiContext,
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
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ValidationGuard)
  async setCloudFunctionEnvironment(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: SetCloudFunctionEnvironmentDto,
    @Param('function_uuid') function_uuid: string,
  ) {
    body.function_uuid = function_uuid;
    return await this.acurastService.setCloudFunctionEnvironment(context, body);
  }

  @Get('cloud-functions/:function_uuid/environment')
  @Validation({ dto: SetCloudFunctionEnvironmentDto })
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ValidationGuard)
  async getCloudFunctionEnvironment(
    @Ctx() context: DevConsoleApiContext,
    @Param('function_uuid') function_uuid: string,
  ) {
    return await this.acurastService.getCloudFunctionEnvironment(
      context,
      function_uuid,
    );
  }

  @Get('cloud-functions/:function_uuid/usage')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: CloudFunctionUsageDto, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getCloudFunctionUsage(
    @Param('function_uuid') function_uuid: string,
    @Query() query: CloudFunctionUsageDto,
  ) {
    query.function_uuid = function_uuid;
    return await this.acurastService.getCloudFunctionUsage(query);
  }

  @Delete('cloud-functions/:function_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async archiveContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('function_uuid') function_uuid: string,
  ) {
    return await this.acurastService.archiveCloudFunction(
      context,
      function_uuid,
    );
  }

  @Patch('cloud-functions/:function_uuid/activate')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async activateContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('function_uuid') function_uuid: string,
  ) {
    return await this.acurastService.activateCloudFunction(
      context,
      function_uuid,
    );
  }

  // @Get('jobs/:job_uuid')
  // @Permissions({ role: RoleGroup.ProjectAccess })
  // @UseGuards(AuthGuard)
  // async getJob(
  //   @Ctx() context: DevConsoleApiContext,
  //   @Param('job_uuid') uuid: string,
  // ) {
  //   return await this.acurastService.getJob(context, uuid);
  // }

  @Patch('jobs/:job_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: UpdateJobDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async updateJob(
    @Ctx() context: DevConsoleApiContext,
    @Param('job_uuid') job_uuid: string,
    @Body() body: UpdateJobDto,
  ) {
    body.job_uuid = job_uuid;
    return await this.acurastService.updateJob(context, body);
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
