import { ServiceContext } from '@apillon/service-lib';
import { Override } from './models/override.model';
import { CreateOverrideDto, PopulateFrom, SerializeFor } from '@apillon/lib';

export class OverrideService {
  static async createOverride(
    data: CreateOverrideDto,
    context: ServiceContext,
  ) {
    const overrides = await new Override({}, context).findManyByProjectUuid(
      data.project_uuid,
    );
    const override = overrides.find(
      (override) => override.quota_id === data.quota_id,
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
}
