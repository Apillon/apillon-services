import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';

import { DevConsoleApiContext } from '../../context';
import { ServiceQueryFilter } from './dtos/services-query-filter.dto';
import { Service } from './models/service.model';
import { CodeException, ValidationException } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class ServicesService {
  async getService(context: DevConsoleApiContext, id: number) {
    const service: Service = await new Service({}, context).populateById(id);
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
    //TODO: Check if service of such type in that project already exists
    return await body.populate({ service_uuid: uuidV4() }).insert();
  }

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
    const service: Service = await new Service({}, context).populateById(id);
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
