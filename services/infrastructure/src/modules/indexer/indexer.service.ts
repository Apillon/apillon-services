import {
  BaseProjectQueryFilter,
  CreateRpcUrlDto,
  Lmas,
  LogType,
  ServiceName,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import { InfrastructureValidationException } from '../../lib/exceptions';
import { Indexer } from './models/indexer.model';

export class IndexerService {
  static async createIndexer(
    { data }: { data: CreateRpcUrlDto },
    context: ServiceContext,
  ) {
    const indexer = new Indexer(
      {
        data,
        indexer_uuid: uuidV4(),
      },
      context,
    );

    await indexer.validateOrThrow(InfrastructureValidationException);

    //Insert
    await indexer.insert();

    await Promise.all([
      new Lmas().writeLog({
        context,
        project_uuid: indexer.project_uuid,
        logType: LogType.INFO,
        message: 'New indexer created',
        location: 'IndexerService/createIndexer',
        service: ServiceName.INFRASTRUCTURE,
        data: indexer.serialize(),
      }),
    ]);

    return indexer.serializeByContext();
  }

  static async listIndexers(
    event: {
      query: BaseProjectQueryFilter;
    },
    context: ServiceContext,
  ) {
    return await new Indexer(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(new BaseProjectQueryFilter(event.query));
  }
}
