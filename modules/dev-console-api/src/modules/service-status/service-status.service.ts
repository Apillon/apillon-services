import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ServiceStatus } from './models/service_status.model';
import {
  CacheKeyPrefix,
  CodeException,
  ModelValidationException,
  ValidatorErrorCode,
  invalidateCachePrefixes,
} from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { CreateOrUpdateServiceStatusDto } from './dtos/create-or-update-service-status.dto';

@Injectable()
export class ServiceStatusService {
  async createServiceStatus(
    context: DevConsoleApiContext,
    data: CreateOrUpdateServiceStatusDto,
  ) {
    const serviceStatus = new ServiceStatus(data, context);
    await serviceStatus.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    const createdServiceStatus = await serviceStatus.insert();
    await invalidateCachePrefixes([CacheKeyPrefix.SERVICE_STATUS]);

    return createdServiceStatus;
  }

  async updateServiceStatus(
    {
      serviceStatusId,
      data,
    }: {
      serviceStatusId: number;
      data: CreateOrUpdateServiceStatusDto;
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

    await invalidateCachePrefixes([CacheKeyPrefix.SERVICE_STATUS]);

    return serviceStatus;
  }
}
