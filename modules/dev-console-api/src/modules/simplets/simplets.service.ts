import {
  Ams,
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  CodeException,
  CreateApiKeyDto,
  DefaultApiKeyRole,
  DeployedSimpletsQueryFilterDto,
  SimpletDeployDto,
  SimpletRedeployDto,
  SimpletsMicroservice,
  SimpletsQueryFilterDto,
  SystemErrorCode,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ServicesService } from '../services/services.service';
import { ServiceQueryFilter } from '../services/dtos/services-query-filter.dto';

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

    if (!body.apillonApiKey && !body.apillonApiSecret) {
      const { apiKey, apiKeySecret } = await this.createSimpletApiKey(
        context,
        body.project_uuid,
        `${body.name} (Simplet)`,
      );
      body.apillonApiKey = apiKey;
      body.apillonApiSecret = apiKeySecret;
    }

    return (await new SimpletsMicroservice(context).deploySimplet(body)).data;
  }

  async redeploySimplet(
    context: DevConsoleApiContext,
    body: SimpletRedeployDto,
  ) {
    return (await new SimpletsMicroservice(context).redeploySimplet(body)).data;
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

  private async createSimpletApiKey(
    context: DevConsoleApiContext,
    project_uuid: string,
    apiKeyName: string,
  ) {
    const serviceList = await this.serviceService.getServiceList(
      context,
      new ServiceQueryFilter({}, context).populate({
        project_uuid,
      }),
    );
    const storageService = serviceList.items.find(
      (item) => item.serviceType_id === AttachedServiceType.STORAGE,
    );
    if (!storageService) {
      throw new CodeException({
        code: SystemErrorCode.MICROSERVICE_SYSTEM_ERROR,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errorMessage:
          'Storage service is required for simplet deployment but was not found.',
      });
    }

    const nftService = serviceList.items.find(
      (item) => item.serviceType_id === AttachedServiceType.NFT,
    );
    if (!nftService) {
      throw new CodeException({
        code: SystemErrorCode.MICROSERVICE_SYSTEM_ERROR,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errorMessage:
          'NFT service is required for simplet deployment but was not found.',
      });
    }

    const createdApiKeyResponse = await new Ams(context).createApiKey(
      new CreateApiKeyDto({}, context).populate({
        project_uuid,
        name: apiKeyName,
        testNetwork: false,
        roles: [
          // STORAGE
          new ApiKeyRoleBaseDto({}, context).populate({
            project_uuid,
            role_id: DefaultApiKeyRole.KEY_READ,
            service_uuid: storageService.service_uuid,
            serviceType_id: AttachedServiceType.STORAGE,
          }),
          new ApiKeyRoleBaseDto({}, context).populate({
            project_uuid,
            role_id: DefaultApiKeyRole.KEY_EXECUTE,
            service_uuid: storageService.service_uuid,
            serviceType_id: AttachedServiceType.STORAGE,
          }),
          // HOSTING
          new ApiKeyRoleBaseDto({}, context).populate({
            project_uuid,
            role_id: DefaultApiKeyRole.KEY_READ,
            service_uuid: storageService.service_uuid,
            serviceType_id: AttachedServiceType.HOSTING,
          }),
          new ApiKeyRoleBaseDto({}, context).populate({
            project_uuid,
            role_id: DefaultApiKeyRole.KEY_EXECUTE,
            service_uuid: storageService.service_uuid,
            serviceType_id: AttachedServiceType.HOSTING,
          }),
          // NFTs
          new ApiKeyRoleBaseDto({}, context).populate({
            project_uuid,
            role_id: DefaultApiKeyRole.KEY_READ,
            service_uuid: nftService.service_uuid,
            serviceType_id: AttachedServiceType.NFT,
          }),
          new ApiKeyRoleBaseDto({}, context).populate({
            project_uuid,
            role_id: DefaultApiKeyRole.KEY_WRITE,
            service_uuid: nftService.service_uuid,
            serviceType_id: AttachedServiceType.NFT,
          }),
          new ApiKeyRoleBaseDto({}, context).populate({
            project_uuid,
            role_id: DefaultApiKeyRole.KEY_EXECUTE,
            service_uuid: nftService.service_uuid,
            serviceType_id: AttachedServiceType.NFT,
          }),
        ],
      }),
    );

    return createdApiKeyResponse.data;
  }
}
