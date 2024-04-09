import { ServiceContext } from '@apillon/service-lib';
import { Override } from './models/override.model';
import {
  CreateQuotaOverrideDto,
  QuotaOverrideDto,
  PopulateFrom,
} from '@apillon/lib';
import { ConfigErrorCode } from '../../config/types';
import { ScsCodeException } from '../../lib/exceptions';

export class OverrideService {
  static async createOverride(
    dto: CreateQuotaOverrideDto,
    context: ServiceContext,
  ) {
    const override = await new Override({}, context).findByQuotaAndUuid(dto);

    // If an override exists, update it, else create a new override
    if (override.exists()) {
      override.populate(dto, PopulateFrom.ADMIN);
      await override.update();
      return override;
    }
    const newOverride = new Override(dto, context);
    return await newOverride.insert();
  }

  static async deleteOverride(dto: QuotaOverrideDto, context: ServiceContext) {
    const override = await new Override({}, context).findByQuotaAndUuid(dto);
    if (!override?.exists()) {
      throw new ScsCodeException({
        status: 404,
        code: ConfigErrorCode.OVERRIDE_NOT_FOUND,
      });
    }
    await override.delete();
    return true;
  }
}
