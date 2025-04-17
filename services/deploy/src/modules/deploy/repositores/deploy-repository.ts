import { ServiceContext } from '@apillon/service-lib';

import {
  BackendsQueryFilter,
  PoolConnection,
  PopulateFrom,
} from '@apillon/lib';
import { Backend } from '../models/backend.model';
import { BaseRepository } from './base-repository';
import { DeployCodeException } from '../../../lib/exceptions';
import { DbTables, DeployErrorCode } from '../../../config/types';

export class DeployRepository extends BaseRepository {
  constructor(context: ServiceContext) {
    super(context);
  }

  //#region ------------- BACKEND -------------

  async listBackends(filter: BackendsQueryFilter) {
    return await new Backend({}, this.context).getList(filter);
  }

  async getBackend(uuid: string) {
    const backend = await new Backend({}, this.context).populateByUUID(uuid);
    if (!backend.exists()) {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.DEPLOY_NOT_FOUND,
        context: this.context,
        errorMessage: 'Deploy not found',
      });
    }
    return backend;
  }

  async getBackendForStatusUpdate(
    updateIntervalHours: number,
    conn: PoolConnection,
  ): Promise<Backend[]> {
    const data = await this.context.mysql.paramExecute(
      `SELECT *
       FROM \`${DbTables.BACKEND}\`
       WHERE webhookTriggered IS NULL
          OR webhookTriggered <= NOW() - INTERVAL @updateIntervalHours HOUR
       ORDER BY webhookTriggered
       LIMIT 10
       FOR
       UPDATE SKIP LOCKED
      `,
      { updateIntervalHours },
      conn,
    );
    return (
      data?.map((item) =>
        new Backend({}, this.context).populate(item, PopulateFrom.DB),
      ) || []
    );
  }

  //#endregion
}
