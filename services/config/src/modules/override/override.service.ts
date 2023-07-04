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
  static async createOverride(
    data: CreateOverrideDto,
    context: ServiceContext,
  ) {
    const override = await OverrideService.getOverrideByProjectAndQuota(
      data,
      context,
    );
    // If an override exists, update it, else create a new override
    if (override) {
      override.populate(data, PopulateFrom.ADMIN);
      await override.update(SerializeFor.ADMIN);
      return override;
    }
    const newOverride = new Override(data, context);
    return await newOverride.insert(SerializeFor.ADMIN);
  }

  static async deleteOverride(
    data: DeleteOverrideDto,
    context: ServiceContext,
  ) {
    const override = await OverrideService.getOverrideByProjectAndQuota(
      data,
      context,
    );
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
    data: CreateOverrideDto | DeleteOverrideDto,
    context: ServiceContext,
  ) {
    const overrides = await new Override({}, context).findManyByProjectUuid(
      data.project_uuid,
    );
    return overrides.find((override) => override.quota_id === data.quota_id);
  }
}
