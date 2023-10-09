import {
  Ams,
  ApiKeyQueryFilterDto,
  ApiKeyRoleDto,
  CodeException,
  CreateApiKeyDto,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { Service } from '../services/models/service.model';

@Injectable()
export class ApiKeyService {
  /**
   * Get the list of API keys based on the provided query filter.
   * @param {DevConsoleApiContext} context - The API context
   * @param {ApiKeyQueryFilterDto} query - The query filter for API keys.
   * @returns {Promise<any>} - The AMS service response
   */
  async getApiKeyList(
    context: DevConsoleApiContext,
    query: ApiKeyQueryFilterDto,
  ) {
    return (await new Ams(context).listApiKeys(query)).data;
  }

  /**
   * Create a new API key for a project.
   * @param {DevConsoleApiContext} context - The API context
   * @param {CreateApiKeyDto} body - The data for creating a new API key.
   * @returns {Promise<any>} - The AMS service response with new API key data.
   * @throws {CodeException} - If the project or service does not exist or if the service is not part of the project.
   */
  async createApiKey(context: DevConsoleApiContext, body: CreateApiKeyDto) {
    const project: Project = await new Project({}, context).populateByUUID(
      body.project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canModify(context);

    //roles - check if services exists & set serviceType
    if (body.roles && body.roles.length > 0) {
      for (const apiKeyRole of body.roles) {
        const service: Service = await new Service({}, context).populateByUUID(
          apiKeyRole.service_uuid,
        );

        if (!service.exists()) {
          throw new CodeException({
            code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
            status: HttpStatus.NOT_FOUND,
            errorCodes: ResourceNotFoundErrorCode,
          });
        }

        await service.canAccess(context);

        if (service.project_id != project.id) {
          throw new CodeException({
            code: ValidatorErrorCode.SERVICE_NOT_IN_THIS_PROJECT,
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errorCodes: ValidatorErrorCode,
          });
        }

        apiKeyRole.serviceType_id = service.serviceType_id;
      }
    }

    return (await new Ams(context).createApiKey(body)).data;
  }

  /**
   * Delete an API key by its ID.
   * @param {DevConsoleApiContext} context - The API context
   * @param {number} id - The ID of the API key to be deleted.
   * @returns {Promise<any>} - The AMS service response
   */
  async deleteApiKey(context: DevConsoleApiContext, id: number) {
    return (await new Ams(context).deleteApiKey({ id })).data;
  }

  /**
   * Assign a role to an API key.
   * @param {DevConsoleApiContext} context - The API context
   * @param {ApiKeyRoleDto} body - The data for assigning a role to the API key.
   * @returns {Promise<any>} - The AMS service response
   * @throws {CodeException} - If the project or service does not exist.
   */
  async assignRoleToApiKey(context: DevConsoleApiContext, body: ApiKeyRoleDto) {
    //Check project
    const project: Project = await new Project({}, context).populateByUUID(
      body.project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canModify(context);
    //check service
    const service: Service = await new Service({}, context).populateByUUID(
      body.service_uuid,
    );

    if (!service.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    body.serviceType_id = service.serviceType_id;

    return (await new Ams(context).assignRoleToApiKey(body)).data;
  }

  /**
   * Remove a role from an API key.
   * @param {DevConsoleApiContext} context - The API context
   * @param {ApiKeyRoleDto} body - The data for removing a role from the API key.
   * @returns {Promise<any>} - The AMS service response
   */
  async removeApiKeyRole(context: DevConsoleApiContext, body: ApiKeyRoleDto) {
    return (await new Ams(context).removeApiKeyRole(body)).data;
  }

  /**
   * Remove roles from an API key by service uuid
   * @param {DevConsoleApiContext} context - The API context
   * @param {ApiKeyRoleDto} body - The data for removing a role from the API key.
   * @returns {Promise<any>} - The AMS service response
   */
  async removeApiKeyRolesByService(
    context: DevConsoleApiContext,
    body: ApiKeyRoleDto,
  ) {
    return (await new Ams(context).removeApiKeyRolesByService(body)).data;
  }

  /**
   * Get the roles assigned to an API key.
   * @param {DevConsoleApiContext} context - The API context
   * @param {number} id - The ID of the API key.
   * @returns {Promise<any>} - The AMS service response with list of roles assigned to the API key.
   */
  async getApiKeyRoles(context: DevConsoleApiContext, id: number) {
    return (await new Ams(context).getApiKeyRoles({ apiKey_id: id })).data;
  }
}
