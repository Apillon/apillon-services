import {
  BaseProjectQueryFilter,
  CreateIndexerDto,
  IndexerLogsQueryFilter,
  IndexerUsageDataQueryFilter,
  InfrastructureMicroservice,
  UpdateIndexerDto,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class IndexingService {
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

  async updateIndexer(context: DevConsoleApiContext, body: UpdateIndexerDto) {
    return (await new InfrastructureMicroservice(context).updateIndexer(body))
      .data;
  }

  async hibernateIndexer(context: DevConsoleApiContext, indexer_uuid: string) {
    return (
      await new InfrastructureMicroservice(context).hibernateIndexer(
        indexer_uuid,
      )
    ).data;
  }

  async deleteIndexer(context: DevConsoleApiContext, indexer_uuid: string) {
    return (
      await new InfrastructureMicroservice(context).deleteIndexer(indexer_uuid)
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

  async getIndexerDeployments(
    context: DevConsoleApiContext,
    indexer_uuid: string,
  ) {
    return (
      await new InfrastructureMicroservice(context).getIndexerDeployments(
        indexer_uuid,
      )
    ).data;
  }

  async getIndexerUsageData(
    context: DevConsoleApiContext,
    query: IndexerUsageDataQueryFilter,
  ) {
    return (
      await new InfrastructureMicroservice(context).getIndexerUsageData(query)
    ).data;
  }
}
