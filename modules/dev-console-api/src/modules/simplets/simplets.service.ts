import {
  AttachedServiceType,
  DeployedSimpletsQueryFilterDto,
  SimpletDeployDto,
  SimpletsMicroservice,
  SimpletsQueryFilterDto,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ServicesService } from '../services/services.service';

@Injectable()
export class SimpletsService {
  constructor(private readonly serviceService: ServicesService) {}

  //#region ------------- SIMPLETS -------------
  async listSimplets(
    context: DevConsoleApiContext,
    query: SimpletsQueryFilterDto,
  ) {
    return (await new SimpletsMicroservice(context).listSimplets(query)).data;
  }

  // DEPLOY
  async deploySimplet(context: DevConsoleApiContext, body: SimpletDeployDto) {
    await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.SIMPLETS,
    );

    return (await new SimpletsMicroservice(context).deploySimplet(body)).data;
  }

  async getSimplet(context: DevConsoleApiContext, uuid: string) {
    return (await new SimpletsMicroservice(context).getSimplet(uuid)).data;
  }

  //#endregion

  //#region ------------- SIMPLETS -------------

  async getDeployedSimplet(context: DevConsoleApiContext, uuid: string) {
    return (await new SimpletsMicroservice(context).getDeployedSimplet(uuid))
      .data;
  }

  async listDeployedSimplets(
    context: DevConsoleApiContext,
    query: DeployedSimpletsQueryFilterDto,
  ) {
    return (await new SimpletsMicroservice(context).listDeployedSimplets(query))
      .data;
  }

  //#endregion
}
