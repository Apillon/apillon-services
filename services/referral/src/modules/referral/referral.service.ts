import { CreateReferralDto, SerializeFor } from '@apillon/lib';
import { ServiceContext } from '../../context';
import {
  ReferralCodeException,
  ReferralValidationException,
} from '../../lib/exceptions';
import { Player } from './models/player.model';
import { ReferralErrorCode } from '../../config/types';
import { HttpStatusCode } from 'axios';

export class ReferralService {
  static async createReferralPlayer(
    event: { body: CreateReferralDto },
    context: ServiceContext,
  ): Promise<any> {
    const r: Player = await new Player({}, context).populateByUserUuid(
      context.user.user_uuid,
    );

    if (!r.exists()) {
      r.populate({
        user_id: context.user.user_uuid,
        referral_code: await r.generateCode(),
        referral_id: event.body.referral_id,
      });
    }

    if (!r.termsAccepted && event.body.termsAccepted) {
      r.termsAccepted = new Date();
    }

    try {
      await r.validate();
    } catch (err) {
      await r.handle(err);
      if (!r.isValid()) throw new ReferralValidationException(r);
    }

    await r.insert();
    return r.serialize(SerializeFor.PROFILE);
  }

  static async getReferralPlayer(context: ServiceContext): Promise<any> {
    const userId = context?.user?.id;
    if (!userId) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR,
        status: HttpStatusCode.BadRequest,
      });
    }
    const r: Player = await new Player({}, context).populateByUserUuid(
      context?.user?.user_uuid,
    );

    if (!r.exists()) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR,
        status: HttpStatusCode.BadRequest,
      });
    }

    return r.serialize(SerializeFor.PROFILE);
  }
}
