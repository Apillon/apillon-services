import { ServiceContext } from '@apillon/service-lib';
import { SimpletDeploy } from '../models/simpletDeploy.model';
import {
  DeployedSimpletsQueryFilterDto,
  SimpletsQueryFilterDto,
} from '@apillon/lib';
import { Simplet } from '../models/simplet.model';
import { BaseRepository } from './base-repository';
import { SimpletsCodeException } from '../../../lib/exceptions';
import { SimpletsErrorCode } from '../../../config/types';

export class SimpletsRepository extends BaseRepository {
  constructor(context: ServiceContext) {
    super(context);
  }

  //#region ------------- SIMPLETS -------------
  async listSimplets(filter: SimpletsQueryFilterDto) {
    return await new Simplet({}, this.context).getList(filter);
  }

  async getSimplet(uuid: string): Promise<Simplet> {
    const simplet = await new Simplet({}, this.context).populateByUUID(uuid);
    if (!simplet || !simplet.exists()) {
      throw new SimpletsCodeException({
        status: 404,
        code: SimpletsErrorCode.SIMPLET_NOT_FOUND,
        context: this.context,
      });
    }
    return simplet;
  }

  //#endregion

  //#region ------------- DEPLOYED SIMPLETS -------------

  async listDeployedSimplets(filter: DeployedSimpletsQueryFilterDto) {
    return await new SimpletDeploy({}, this.context).getList(filter);
  }

  async getDeployedSimplet(uuid: string) {
    return await new SimpletDeploy({}, this.context).populateByUUID(uuid);
  }

  //#endregion
}
