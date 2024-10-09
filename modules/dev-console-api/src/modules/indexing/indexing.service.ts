import {
  BaseProjectQueryFilter,
  CreateIndexerDto,
  IndexerLogsQueryFilter,
  InfrastructureMicroservice,
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

  async updateIndexer(
    context: DevConsoleApiContext,
    indexer_uuid: string,
    body: any,
  ) {
    return (
      await new InfrastructureMicroservice(context).updateIndexer(
        indexer_uuid,
        body,
      )
    ).data;
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
}
