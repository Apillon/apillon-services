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
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ProjectAccessGuard } from '../../guards/project-access.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { IndexingService } from './indexing.service';
@Controller('indexing')
@Permissions({ permission: DefaultPermission.INDEXING })
export class IndexerController {
  constructor(private readonly indexingService: IndexingService) {}

  @Get('indexers')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, ProjectAccessGuard, AuthGuard)
  async listIndexers(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.indexingService.listIndexers(context, query);
  }

  @Post('indexer')
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
    return await this.indexingService.createIndexer(context, body);
  }

  @Get('indexers/:indexer_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexingService.getIndexer(context, indexer_uuid);
  }

  @Patch('indexers/:indexer_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
    @Body() body: any,
  ) {
    return await this.indexingService.updateIndexer(
      context,
      indexer_uuid,
      body,
    );
  }

  @Post('indexers/:indexer_uuid/hibernate')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async hibernateIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexingService.hibernateIndexer(context, indexer_uuid);
  }

  @Delete('indexers/:indexer_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexingService.deleteIndexer(context, indexer_uuid);
  }

  @Get('indexers/:indexer_uuid/logs')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: IndexerLogsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getIndexerLogs(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
    @Query() query: IndexerLogsQueryFilter,
  ) {
    return await this.indexingService.getIndexerLogs(
      context,
      indexer_uuid,
      query,
    );
  }

  @Get('indexers/:indexer_uuid/deployments')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getIndexerDeployments(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexingService.getIndexerDeployments(
      context,
      indexer_uuid,
    );
  }
}
