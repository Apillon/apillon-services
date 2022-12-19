import { SerializeFor } from '@apillon/lib';
import { ServiceContext } from '../../context';
import { ReferralValidationException } from '../../lib/exceptions';
import { Referral } from './models/referral.model';
import { v4 as uuidV4 } from 'uuid';

export class ReferralService {
  static async createReferral(context: ServiceContext): Promise<any> {
    const r: Referral = new Referral(
      { user_id: context.user.id, referral_code: uuidV4() },
      context,
    );

    try {
      await r.validate();
    } catch (err) {
      await r.handle(err);
      if (!r.isValid()) throw new ReferralValidationException(r);
    }

    await r.insert();
    return r.serialize(SerializeFor.PROFILE);
  }

  static async getReferral(context: ServiceContext): Promise<any> {
    const r: Referral = await new Referral({}, context).populateByUserId(
      context?.user?.id,
    );

    if (!r.exists()) {
      // create referral
      await this.createReferral(context);
    }

    return r.serialize(SerializeFor.PROFILE);
  }
}
