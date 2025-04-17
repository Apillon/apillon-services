import { ServiceContext } from '@apillon/service-lib';

import { BackendsQueryFilter } from '@apillon/lib';
import { Backend } from '../models/backend.model';
import { BaseRepository } from './base-repository';
import { DeployCodeException } from '../../../lib/exceptions';
import { DeployErrorCode } from '../../../config/types';

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

  //#endregion
}
