import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ServiceStatus } from './models/service_status.model';
import {
  CodeException,
  ModelValidationException,
  ValidatorErrorCode,
} from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { CreateServiceStatusDto } from './dtos/create-service-status.dto';
import { UpdateServiceStatusDto } from './dtos/update-service-status.dto';

@Injectable()
export class ServiceStatusService {
  async getServiceStatusList(context: DevConsoleApiContext) {
    return await new ServiceStatus({}, context).listServiceStatuses(context);
  }

  async createServiceStatus(
    context: DevConsoleApiContext,
    data: CreateServiceStatusDto,
  ) {
    const serviceStatus = new ServiceStatus(data, context);
    return await serviceStatus.insert();
  }

  async updateServiceStatus(
    {
      serviceStatusId,
      data,
    }: {
      serviceStatusId: number;
      data: UpdateServiceStatusDto;
    },
    context: DevConsoleApiContext,
  ) {
    const serviceStatus = await new ServiceStatus({}, context).populateById(
      serviceStatusId,
    );

    if (!serviceStatus.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.SERVICE_STATUS_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    serviceStatus.populate(data);
    await serviceStatus.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );

    await serviceStatus.update();

    return serviceStatus;
  }
}
