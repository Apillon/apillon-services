import { HttpStatus, Injectable, Patch } from '@nestjs/common';
import { CodeException, ValidationException } from 'at-lib';
import { ResourceNotFoundErrorCode, ValidatorErrorCode } from '../../config/types';

import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';

import { Service } from './models/service.model';

@Injectable()
export class ServicesService {
  async createService(context: DevConsoleApiContext, body: Service): Promise<Service> {
    return await body.insert();
  }

  async updateService(context: DevConsoleApiContext, id: number, data: any): Promise<Service> {
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
      if (!service.isValid()) throw new ValidationException(service, ValidatorErrorCode);
    }

    await service.update();
    return service;
  }
}
