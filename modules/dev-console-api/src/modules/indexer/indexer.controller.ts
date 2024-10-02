import {
  BaseProjectQueryFilter,
  CreateIndexerDto,
  DefaultPermission,
  DefaultUserRole,
  IndexerLogsQueryFilter,
  PopulateFrom,
  RoleGroup,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Validation, Permissions } from '@apillon/modules-lib';
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
import { ProjectAccessGuard } from '../../guards/project-access.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { IndexerService } from './indexer.service';
@Controller('indexer')
@Permissions({ permission: DefaultPermission.INDEXER })
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Get()
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, ProjectAccessGuard, AuthGuard)
  async listIndexers(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.indexerService.listIndexers(context, query);
  }

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: CreateIndexerDto })
  @UseGuards(ValidationGuard, ProjectAccessGuard, AuthGuard)
  async createIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateIndexerDto,
  ) {
    return await this.indexerService.createIndexer(context, body);
  }

  @Get(':indexer_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexerService.getIndexer(context, indexer_uuid);
  }

  @Get(':indexer_uuid/logs')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: IndexerLogsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getIndexerLogs(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
    @Query() query: IndexerLogsQueryFilter,
  ) {
    return await this.indexerService.getIndexerLogs(
      context,
      indexer_uuid,
      query,
    );
  }

  @Get(':indexer_uuid/url-for-source-code-upload')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async getUrlForSourceCodeUpload(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexerService.getUrlForSourceCodeUpload(
      context,
      indexer_uuid,
    );
  }

  @Post(':indexer_uuid/deploy')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deployIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexerService.deployIndexer(context, indexer_uuid);
  }

  @Get(':indexer_uuid/deployments')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getIndexerDeployments(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexerService.getIndexerDeployments(
      context,
      indexer_uuid,
    );
  }
}
