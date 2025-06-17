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
import { ServiceQueryFilter } from '../services/dtos/services-query-filter.dto';
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

    // validate or create API credentials
    if (body.apillonApiKey && body.apillonApiSecret) {
      // validate provided API key to make sure we don't trigger simplet deploy in case it's invalid
      try {
        const apiKey = (
          await new Ams(context).getApiKey({
            apiKey: body.apillonApiKey,
            apiKeySecret: body.apillonApiSecret,
          })
        ).data;
        const requiredRole = DefaultApiKeyRole.KEY_EXECUTE;
        const requiredService = AttachedServiceType.HOSTING;
        if (
          !apiKey.apiKeyRoles?.find(
            (role: { role_id: number; serviceType_id: AttachedServiceType }) =>
              role.role_id === requiredRole &&
              role.serviceType_id === requiredService,
          )
        ) {
          throw new CodeException({
            code: SystemErrorCode.MICROSERVICE_SYSTEM_ERROR,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            errorMessage: 'API key does not have required role for build',
          });
        }
      } catch (e: unknown) {
        if (e instanceof CodeException) {
          throw e;
        }
        throw new CodeException({
          code: SystemErrorCode.MICROSERVICE_SYSTEM_ERROR,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          errorMessage: 'API key is invalid',
        });
      }
    } else {
      // create new API credentials
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
    const requiredServices = [
      { type: AttachedServiceType.STORAGE, name: 'Storage' },
      { type: AttachedServiceType.NFT, name: 'NFT' },
      { type: AttachedServiceType.HOSTING, name: 'Hosting' },
    ];

    const serviceList = await this.serviceService.getServiceList(
      context,
      new ServiceQueryFilter({}, context).populate({ project_uuid }),
    );

    const services = requiredServices.map(({ type, name }) => {
      const service = serviceList.items.find(
        (item) => item.serviceType_id === type,
      );
      if (!service) {
        throw new CodeException({
          code: SystemErrorCode.MICROSERVICE_SYSTEM_ERROR,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          errorMessage: `${name} service is required for simplet deployment but was not found.`,
        });
      }
      return service;
    });

    // Attach API key roles
    const roles = services.flatMap((service) =>
      [
        DefaultApiKeyRole.KEY_READ,
        DefaultApiKeyRole.KEY_WRITE,
        DefaultApiKeyRole.KEY_EXECUTE,
      ].map(
        (role_id) =>
          new ApiKeyRoleBaseDto(
            {
              project_uuid,
              role_id,
              service_uuid: service.service_uuid,
              serviceType_id: service.serviceType_id,
            },
            context,
          ),
      ),
    );

    const createdApiKeyResponse = await new Ams(context).createApiKey(
      new CreateApiKeyDto({}, context).populate({
        project_uuid,
        name: apiKeyName,
        testNetwork: false,
        roles,
      }),
    );

    return createdApiKeyResponse.data;
  }
}
