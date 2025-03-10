import { ServiceContext } from '@apillon/service-lib';
import { SimpletDeploy } from '../models/simpletDeploy.model';
import {
  DeployedSimpletsQueryFilterDto,
  SimpletsQueryFilterDto,
} from '@apillon/lib';
import { Simplet } from '../models/simplet.model';
import { BaseRepository } from './base-repository';

export class SimpletsRepository extends BaseRepository {
  constructor(context: ServiceContext) {
    super(context);
  }

  //#region ------------- SIMPLETS -------------
  async listSimplets(filter: SimpletsQueryFilterDto) {
    return await new Simplet({}, this.context).getList(filter);
  }

  async getSimplet(uuid: string) {
    return await new Simplet({}, this.context).populateByUUID(uuid);
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
