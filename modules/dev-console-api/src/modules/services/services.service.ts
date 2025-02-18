import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';

import {
  AttachedServiceType,
  CodeException,
  DefaultPermission,
  ForbiddenErrorCodes,
  Lmas,
  LogType,
  ServiceName,
  ModelValidationException,
  Mailing,
} from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { ServiceDto } from './dtos/service.dto';
import { ServiceQueryFilter } from './dtos/services-query-filter.dto';
import { Service } from './models/service.model';
import { ServiceType } from './models/service-type.model';
import { InfrastructureMicroservice } from '@apillon/lib';

@Injectable()
export class ServicesService {
  async getServiceTypes(context: DevConsoleApiContext) {
    return await new ServiceType({}, context).getServiceTypes();
  }

  /**
   * Retrieves a service by its ID.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {string} uuid - The ID of the service to retrieve.
   * @returns {Promise<any>} - The retrieved service.
   */
  async getService(
    context: DevConsoleApiContext,
    uuid: string,
  ): Promise<Service> {
    const service: Service = await new Service({}, context).populateByUUID(
      uuid,
    );
    if (!service.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    await service.canAccess(context);

    return service;
  }

  /**
   * Retrieves a list of services based on a query filter.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {ServiceQueryFilter} query - Service query filter.
   * @returns {Promise<Service[]>} - List of services.
   */
  async getServiceList(
    context: DevConsoleApiContext,
    query: ServiceQueryFilter,
  ) {
    return await new Service({}).getServices(context, query);
  }

  /**
   * Create specified service for project if it doesn't exist yet
   * @param context
   * @param project_uuid
   * @param serviceType_id
   * @returns {Promise<boolean>} - True if service was created, false otherwise.
   */
  async createServiceIfNotExists(
    context: DevConsoleApiContext,
    project_uuid: string,
    serviceType_id: AttachedServiceType,
  ): Promise<boolean> {
    const { items, total } = await new Service({}).getServices(
      context,
      new ServiceQueryFilter({ project_uuid }, context),
    );

    const filteredServices = items.filter(
      (service) => service.serviceType_id === serviceType_id,
    );

    if (filteredServices.length === 0) {
      const newService = new ServiceDto(
        {
          project_uuid,
          name: `Service ${serviceType_id}`,
          serviceType_id,
        },
        context,
      );

      await this.createService(context, newService, total);
      return true;
    }

    return false;
  }

  /**
   * Creates a new service.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {Service} body - The service object to create.
   * @returns {Promise<any>} - The created service object.
   */
  async createService(
    context: DevConsoleApiContext,
    body: ServiceDto,
    totalServices: number = 1,
  ): Promise<Service> {
    const project = await new Project({}, context).populateByUUIDOrThrow(
      body.project_uuid,
    );

    // Check if user has permissions to use this service type - mapping with permissions need to be done
    const requiredPermission = {
      [AttachedServiceType.AUTHENTICATION]: DefaultPermission.AUTHENTICATION,
      [AttachedServiceType.STORAGE]: DefaultPermission.STORAGE,
      [AttachedServiceType.HOSTING]: DefaultPermission.HOSTING,
      [AttachedServiceType.NFT]: DefaultPermission.NFTS,
      [AttachedServiceType.SOCIAL]: DefaultPermission.SOCIAL,
      [AttachedServiceType.COMPUTING]: DefaultPermission.COMPUTING,
      [AttachedServiceType.CONTRACTS]: DefaultPermission.CONTRACTS,
      [AttachedServiceType.RPC]: DefaultPermission.RPC,
      [AttachedServiceType.INDEXING]: DefaultPermission.INDEXING,
    }[body.serviceType_id];

    if (requiredPermission && !context.hasPermission(requiredPermission)) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorCodes: ForbiddenErrorCodes,
      });
    }

    if (body.serviceType_id === AttachedServiceType.RPC) {
      await new InfrastructureMicroservice(context).createUser(
        body.project_uuid,
      );
    }

    const service = new Service(body, context);
    service.populate({ service_uuid: uuidV4(), project_id: project.id });
    await service.insert();

    Promise.all([
      new Lmas().writeLog({
        context,
        project_uuid: project.project_uuid,
        logType: LogType.INFO,
        message: 'New project service attached',
        location: 'DEV-CONSOLE-API/ServicesService/createService',
        service: ServiceName.DEV_CONSOLE,
        data: {
          service: service.serialize(),
        },
      }),
      // Set mailerlite field indicating the user created a bucket
      new Mailing(context).setMailerliteField('total_services', totalServices),
    ]);

    return service;
  }

  /**
   * Updates a service with new data.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {string} uuid - The ID of the service to update.
   * @param {any} data - The data to update the service with.
   * @returns {Promise<any>} - The updated service object.
   */
  async updateService(
    context: DevConsoleApiContext,
    uuid: string,
    data: any,
  ): Promise<Service> {
    const service: Service = await new Service({}, context).populateByUUID(
      uuid,
    );
    if (!service.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    await service.canModify(context);

    service.populate(data);

    await service.validateOrThrow(ModelValidationException, ValidatorErrorCode);

    await service.update();
    return service;
  }

  /**
   * Deletes a service. (soft delete)
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {string} uuid - The ID of the service to delete.
   * @returns {Promise<any>} - The deleted service object.
   */
  async deleteService(
    context: DevConsoleApiContext,
    uuid: string,
  ): Promise<Service> {
    const service: Service = await new Service({}, context).populateByUUID(
      uuid,
    );
    if (!service.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    await service.canModify(context);

    await service.markDeleted();
    return service;
  }
}
