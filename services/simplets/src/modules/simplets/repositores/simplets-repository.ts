import {
  DeployedSimpletsQueryFilterDto,
  PoolConnection,
  PopulateFrom,
  SimpletsQueryFilterDto,
  SqlModelStatus,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { SimpletDeploy } from '../models/simpletDeploy.model';
import { Simplet } from '../models/simplet.model';
import { BaseRepository } from './base-repository';
import { SimpletsCodeException } from '../../../lib/exceptions';
import { DbTables, SimpletsErrorCode } from '../../../config/types';

export class SimpletsRepository extends BaseRepository {
  constructor(context: ServiceContext) {
    super(context);
  }

  //#region ------------- SIMPLETS -------------
  async listSimplets(filter: SimpletsQueryFilterDto) {
    return await new Simplet({}, this.context).getList(filter);
  }

  async getSimplet(simplet_uuid: string): Promise<Simplet> {
    const simplet = await new Simplet({}, this.context).populateByUUID(
      simplet_uuid,
    );
    if (!simplet || !simplet.exists()) {
      throw new SimpletsCodeException({
        status: 404,
        code: SimpletsErrorCode.SIMPLET_NOT_FOUND,
        context: this.context,
        errorMessage: `Simplet with simplet_uuid ${simplet_uuid} not found`,
      });
    }
    return simplet;
  }

  async getSimpletDeployByBackend(
    backend_uuid: string,
    conn?: PoolConnection,
  ): Promise<SimpletDeploy> {
    const data = await this.context.mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.SIMPLET_DEPLOY}\`
        WHERE backend_uuid = @backend_uuid
          AND status <> ${SqlModelStatus.DELETED};
      `,
      { backend_uuid },
      conn,
    );

    if (!data?.length) {
      throw new SimpletsCodeException({
        status: 404,
        code: SimpletsErrorCode.SIMPLET_NOT_FOUND,
        context: this.context,
        errorMessage: `Simplet deploy with backend_uuid ${backend_uuid} not found`,
      });
    }
    return new SimpletDeploy({}, this.context).populate(
      data[0],
      PopulateFrom.DB,
    );
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
