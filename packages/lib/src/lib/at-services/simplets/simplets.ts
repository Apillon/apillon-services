import { env } from '../../../config/env';
import { AppEnvironment, SimpletsEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { SimpletDeployDto } from './dtos/simplet-deploy.dto';
import { SimpletsMSEventType } from './eventTypes';
import {
  DeployedSimpletsQueryFilterDto,
  SimpletsQueryFilterDto,
} from './dtos/simplets-query-filter.dto';

export class SimpletsMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.SIMPLETS_FUNCTION_NAME_TEST
      : env.SIMPLETS_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.SIMPLETS_SOCKET_PORT_TEST
      : env.SIMPLETS_SOCKET_PORT;
  serviceName = 'SIMPLETS';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  async emitEvent(event: SimpletsMSEventType) {
    return await this.callService(event);
  }

  //#region ------------- SIMPLETS -------------

  public async listSimplets(body: SimpletsQueryFilterDto) {
    return await this.emitEvent({
      eventName: SimpletsEventType.SIMPLETS_LIST,
      body,
    });
  }

  public async deploySimplet(body: SimpletDeployDto) {
    return await this.emitEvent({
      eventName: SimpletsEventType.SIMPLETS_DEPLOY,
      body,
    });
  }

  public async getSimplet(uuid: string) {
    return await this.emitEvent({
      eventName: SimpletsEventType.GET_SIMPLET,
      body: { uuid },
    });
  }

  //#endregion

  //#region ------------- SIMPLETS -------------

  public async getDeployedSimplet(uuid: string) {
    return await this.emitEvent({
      eventName: SimpletsEventType.GET_DEPLOYED_SIMPLET,
      body: { uuid },
    });
  }

  public async listDeployedSimplets(body: DeployedSimpletsQueryFilterDto) {
    return await this.emitEvent({
      eventName: SimpletsEventType.LIST_DEPLOYED_SIMPLETS,
      body,
    });
  }

  //#endregion
}
