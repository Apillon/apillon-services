import { ServiceContext } from '@apillon/service-lib';

import {
  BackendsQueryFilter,
  EncryptionService,
  PoolConnection,
  PopulateFrom,
  ResourceStatus,
} from '@apillon/lib';
import { Backend } from '../models/backend.model';
import { BaseRepository } from './base-repository';
import { DeployCodeException } from '../../../lib/exceptions';
import { DbTables, DeployErrorCode } from '../../../config/types';
import { v4 as uuidV4 } from 'uuid';

export class DeployRepository extends BaseRepository {
  private encryptionService: EncryptionService;

  constructor(context: ServiceContext, encryptionService: EncryptionService) {
    super(context);
    this.encryptionService = encryptionService;
  }

  //#region ------------- BACKEND -------------

  async listBackends(filter: BackendsQueryFilter) {
    return await new Backend({}, this.context).getList(filter);
  }

  async newBackend(
    project_uuid: string,
    name: string,
    description: string,
    dockerCompose: string,
    environmentVariables: string | null = null,
  ): Promise<Backend> {
    return new Backend({}, this.context).populate({
      backend_uuid: uuidV4(),
      name: `${name} (Backend)`,
      description: description ? `${description} (Backend)` : null,
      project_uuid,
      dockerCompose,
      environmentVariables,
      backendStatus: ResourceStatus.REQUESTED,
    });
  }

  async getBackend(uuid: string): Promise<Backend> {
    const backend = await new Backend({}, this.context).populateByUUID(uuid);
    if (!backend.exists()) {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.DEPLOY_NOT_FOUND,
        context: this.context,
        errorMessage: 'Deploy not found',
      });
    }
    backend.environmentVariables = await this.encryptionService.decryptJson(
      backend.environmentVariables,
    );

    return backend;
  }

  async getBackendForStatusUpdate(
    updateIntervalHours: number,
    conn: PoolConnection,
  ): Promise<Backend[]> {
    const pendingStatuses = [
      ResourceStatus.REQUESTED,
      ResourceStatus.DEPLOYING,
    ];

    const data = await this.context.mysql.paramExecute(
      `SELECT *
       FROM \`${DbTables.BACKEND}\`
       WHERE updateTime <= NOW() - INTERVAL @updateIntervalHours HOUR
          OR backendStatus IN (${pendingStatuses.join(', ')})
       ORDER BY updateTime
       LIMIT 100
       FOR
       UPDATE SKIP LOCKED
      `,
      {
        updateIntervalHours,
      },
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
