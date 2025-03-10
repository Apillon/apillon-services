import { ServiceContext } from '@apillon/service-lib';

import { BackendsQueryFilter } from '@apillon/lib';
import { Backend } from '../models/backend.model';
import { BaseRepository } from './base-repository';
import { HostingCodeException } from '../../../lib/exceptions';
import { HostingErrorCode } from '../../../config/types';

export class HostingRepository extends BaseRepository {
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
      throw new HostingCodeException({
        status: 404,
        code: HostingErrorCode.HOSTING_NOT_FOUND,
        context: this.context,
        errorMessage: 'Hosting not found',
      });
    }
    return backend;
  }

  //#endregion
}
