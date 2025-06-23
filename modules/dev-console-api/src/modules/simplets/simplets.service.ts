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
    const requestedServices = await Promise.all([
      this.serviceService.createServiceIfNotExists(
        context,
        body.project_uuid,
        AttachedServiceType.SIMPLETS,
      ),
      this.serviceService.createServiceIfNotExists(
        context,
        body.project_uuid,
        AttachedServiceType.STORAGE,
      ),
      this.serviceService.createServiceIfNotExists(
        context,
        body.project_uuid,
        AttachedServiceType.HOSTING,
      ),
    ]);

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
        requestedServices.map((requestedService) => requestedService.service),
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

  //#region ------------- DEPLOYED SIMPLETS -------------

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

  async deleteSimpleDeploy(context: DevConsoleApiContext, uuid: string) {
    return (await new SimpletsMicroservice(context).deleteSimpleDeploy(uuid))
      .data;
  }

  //#endregion

  private async createSimpletApiKey(
    context: DevConsoleApiContext,
    services: any[],
    project_uuid: string,
    apiKeyName: string,
  ) {
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

  async isSimpletQuotaReached(
    context: DevConsoleApiContext,
    projectUuid: string,
  ) {
    return (
      await new SimpletsMicroservice(context).isSimpletQuotaReached(projectUuid)
    ).data;
  }
}
