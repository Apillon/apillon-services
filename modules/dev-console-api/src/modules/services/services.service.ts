import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';

import { DevConsoleApiContext } from '../../context';
import { ServiceQueryFilter } from './dtos/services-query-filter.dto';
import { Service } from './models/service.model';
import {
  CodeException,
  Lmas,
  LogType,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { Project } from '../project/models/project.model';

@Injectable()
export class ServicesService {
  /**
   * Retrieves a service by its ID.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {number} id - The ID of the service to retrieve.
   * @returns {Promise<Service>} - The retrieved service.
   */
  async getService(context: DevConsoleApiContext, id: number) {
    const service: Service = await new Service({}, context).populateById(id);
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
   * Creates a new service.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {Service} body - The service object to create.
   * @returns {Promise<Service>} - The created service object.
   */
  async createService(
    context: DevConsoleApiContext,
    body: Service,
  ): Promise<Service> {
    //Check if project exists & user has required role on it
    const project: Project = await new Project({}, context).populateById(
      body.project_id,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canModify(context);

    const service = await body.populate({ service_uuid: uuidV4() }).insert();

    await new Lmas().writeLog({
      context: context,
      project_uuid: project.project_uuid,
      logType: LogType.INFO,
      message: 'New project service created',
      location: 'DEV-CONSOLE-API/ServicesService/createService',
      service: ServiceName.DEV_CONSOLE,
    });

    return service;
  }

  /**
   * Updates a service with new data.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {number} id - The ID of the service to update.
   * @param {any} data - The data to update the service with.
   * @returns {Promise<Service>} - The updated service object.
   */
  async updateService(
    context: DevConsoleApiContext,
    id: number,
    data: any,
  ): Promise<Service> {
    const service: Service = await new Service({}, context).populateById(id);
    if (!service.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    await service.canModify(context);

    service.populate(data);

    try {
      await service.validate();
    } catch (err) {
      await service.handle(err);
      if (!service.isValid()) {
        throw new ValidationException(service, ValidatorErrorCode);
      }
    }

    await service.update();
    return service;
  }

  /**
   * Deletes a service. (soft delete)
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {number} id - The ID of the service to delete.
   * @returns {Promise<Service>} - The deleted service object.
   */
  async deleteService(
    context: DevConsoleApiContext,
    id: number,
  ): Promise<Service> {
    const service: Service = await new Service({}, context).populateById(id);
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
