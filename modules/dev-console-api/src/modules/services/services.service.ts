import { HttpStatus, Injectable, Patch } from '@nestjs/common';
import { CodeException, ValidationException } from 'at-lib';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';

import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { ServiceQueryFilter } from './dtos/services-query-filter.dto';

import { Service } from './models/service.model';
import { ServicesModule } from './services.module';

@Injectable()
export class ServicesService {
  async getService(context: DevConsoleApiContext, id: number) {
    let service: Service = await new Service({}, { context }).populateById(id);
    if (!service.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    return service;
  }

  async getServiceList(
    context: DevConsoleApiContext,
    query: ServiceQueryFilter,
  ) {
    return await new Service({}).getServices(context, query);
  }

  async createService(
    context: DevConsoleApiContext,
    body: Service,
  ): Promise<Service> {
    return await body.insert();
  }

  async updateService(
    context: DevConsoleApiContext,
    id: number,
    data: any,
  ): Promise<Service> {
    let service: Service = await new Service({}, { context }).populateById(id);
    if (!service.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    service.populate(data);

    try {
      await service.validate();
    } catch (err) {
      await service.handle(err);
      if (!service.isValid())
        throw new ValidationException(service, ValidatorErrorCode);
    }

    await service.update();
    return service;
  }

  async deleteService(
    context: DevConsoleApiContext,
    id: number,
  ): Promise<Service> {
    let service: Service = await new Service({}, { context }).populateById(id);
    if (!service.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.SERVICE_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    await service.delete();
    return service;
  }
}
