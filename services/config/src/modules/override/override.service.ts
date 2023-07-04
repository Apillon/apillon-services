import { ServiceContext } from '@apillon/service-lib';
import { Override } from './models/override.model';
import {
  CreateOverrideDto,
  DeleteOverrideDto,
  PopulateFrom,
  SerializeFor,
} from '@apillon/lib';
import { ConfigErrorCode } from '../../config/types';
import { ScsCodeException } from '../../lib/exceptions';

export class OverrideService {
  static async createOverride(dto: CreateOverrideDto, context: ServiceContext) {
    // Method to get overrides by project or object uuid, based on which parameter is present in the data
    const getOverrideMethod = OverrideService.getOverrideMethod(dto);

    const override = await getOverrideMethod(dto, context);
    // If an override exists, update it, else create a new override
    if (override) {
      override.populate(dto, PopulateFrom.ADMIN);
      await override.update(SerializeFor.ADMIN);
      return override;
    }
    const newOverride = new Override(dto, context);
    return await newOverride.insert(SerializeFor.ADMIN);
  }

  static async deleteOverride(dto: DeleteOverrideDto, context: ServiceContext) {
    const getOverrideMethod = OverrideService.getOverrideMethod(dto);

    const override = await getOverrideMethod(dto, context);
    if (!override) {
      throw new ScsCodeException({
        status: 404,
        code: ConfigErrorCode.OVERRIDE_NOT_FOUND,
      });
    }
    await override.delete();
    return true;
  }

  static async getOverrideByProjectAndQuota(
    dto: CreateOverrideDto | DeleteOverrideDto,
    context: ServiceContext,
  ) {
    const overrides = await new Override({}, context).findManyByProjectUuid(
      dto.project_uuid,
    );
    return overrides.find((override) => override.quota_id === dto.quota_id);
  }

  static async getOverrideByUserAndQuota(
    dto: CreateOverrideDto | DeleteOverrideDto,
    context: ServiceContext,
  ) {
    const overrides = await new Override({}, context).findManyByObjectUuid(
      dto.object_uuid,
    );
    return overrides.find((override) => override.quota_id === dto.quota_id);
  }

  static getOverrideMethod(dto: CreateOverrideDto | DeleteOverrideDto) {
    const getOverrideMethod = dto.project_uuid
      ? OverrideService.getOverrideByProjectAndQuota
      : dto.object_uuid
      ? OverrideService.getOverrideByUserAndQuota
      : null;

    if (!getOverrideMethod) {
      throw new ScsCodeException({
        status: 422,
        code: ConfigErrorCode.PROJECT_OR_OBJECT_UUID_NOT_PRESENT,
      });
    }

    return getOverrideMethod;
  }
}
