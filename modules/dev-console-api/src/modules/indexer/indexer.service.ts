import {
  BaseProjectQueryFilter,
  CreateIndexerDto,
  IndexerLogsQueryFilter,
  InfrastructureMicroservice,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class IndexerService {
  async listIndexers(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (await new InfrastructureMicroservice(context).listIndexers(query))
      .data;
  }

  async createIndexer(context: DevConsoleApiContext, body: CreateIndexerDto) {
    return (await new InfrastructureMicroservice(context).createIndexer(body))
      .data;
  }

  async getIndexer(context: DevConsoleApiContext, indexer_uuid: string) {
    return (
      await new InfrastructureMicroservice(context).getIndexer(indexer_uuid)
    ).data;
  }

  async getIndexerLogs(
    context: DevConsoleApiContext,
    indexer_uuid: string,
    query: IndexerLogsQueryFilter,
  ) {
    return (
      await new InfrastructureMicroservice(context).getIndexerLogs(
        indexer_uuid,
        query,
      )
    ).data;
  }

  async getUrlForSourceCodeUpload(
    context: DevConsoleApiContext,
    indexer_uuid: string,
  ) {
    return (
      await new InfrastructureMicroservice(context).getUrlForSourceCodeUpload(
        indexer_uuid,
      )
    ).data;
  }

  async deployIndexer(context: DevConsoleApiContext, indexer_uuid: string) {
    return (
      await new InfrastructureMicroservice(context).deployIndexer(indexer_uuid)
    ).data;
  }
}
