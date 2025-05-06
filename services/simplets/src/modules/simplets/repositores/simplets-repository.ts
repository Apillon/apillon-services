import {
  DeployedSimpletsQueryFilterDto,
  ModelValidationException,
  PoolConnection,
  PopulateFrom,
  SimpletsQueryFilterDto,
  SqlModelStatus,
  ValidatorErrorCode,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { SimpletDeploy } from '../models/simpletDeploy.model';
import { Simplet } from '../models/simplet.model';
import { BaseRepository } from './base-repository';
import { SimpletsCodeException } from '../../../lib/exceptions';
import { DbTables, SimpletsErrorCode } from '../../../config/types';
import { v4 as uuidV4 } from 'uuid';

export class SimpletsRepository extends BaseRepository {
  constructor(context: ServiceContext) {
    super(context);
  }

  async createSimpletDeploy(
    project_uuid: string,
    simplet_uuid: string,
    name: string,
    description: string,
    apillonApiKey: string,
    apillonApiSecret: string,
    backendVariables: string,
    frontendVariables: string,
  ): Promise<SimpletDeploy> {
    const simpletDeploy = new SimpletDeploy({}, this.context).populate({
      project_uuid,
      simpletDeploy_uuid: uuidV4(),
      simplet_uuid,
      name,
      description,
      apillonApiKey,
      apillonApiSecret,
      backendVariables,
      frontendVariables,
    });
    await simpletDeploy.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    return simpletDeploy;
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
    return await new SimpletDeploy({}, this.context)
      .populate({
        project_uuid: filter.project_uuid,
      })
      .getList(filter);
  }

  async getDeployedSimplet(uuid: string): Promise<SimpletDeploy> {
    const deployedSimplet = await new SimpletDeploy(
      {},
      this.context,
    ).populateByUUID(uuid);
    if (!deployedSimplet || !deployedSimplet.exists()) {
      throw new SimpletsCodeException({
        status: 404,
        code: SimpletsErrorCode.DEPLOYED_SIMPLET_NOT_FOUND,
        context: this.context,
        errorMessage: `Deployed Simplet with uuid ${uuid} not found`,
      });
    }
    return deployedSimplet;
  }

  //#endregion
}
