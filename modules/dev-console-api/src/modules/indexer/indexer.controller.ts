import {
  BaseProjectQueryFilter,
  CreateIndexerDto,
  IndexerLogsQueryFilter,
  PopulateFrom,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
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
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Get()
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, ProjectAccessGuard, AuthGuard)
  async listApiKeysForProject(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.indexerService.listIndexers(context, query);
  }

  @Post()
  @Validation({ dto: CreateIndexerDto })
  @UseGuards(ValidationGuard, ProjectAccessGuard, AuthGuard)
  async createIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateIndexerDto,
  ) {
    return await this.indexerService.createIndexer(context, body);
  }

  @Get(':indexer_uuid')
  @UseGuards(AuthGuard)
  async getIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexerService.getIndexer(context, indexer_uuid);
  }

  @Get(':indexer_uuid/logs')
  @Validation({ dto: IndexerLogsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  async deployIndexer(
    @Ctx() context: DevConsoleApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.indexerService.deployIndexer(context, indexer_uuid);
  }
}
