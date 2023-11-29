import { ServiceContext } from '@apillon/service-lib';
import { PromoCode } from './models/promo-code.model';
import { AddCreditDto, LogType, Scs, writeLog } from '@apillon/lib';
import { PromoCodeUser } from './models/promo-code-user.model';
import { DbTables } from '../../config/types';

export class PromoCodeService {
  /**
   * Assign promo code credits to a project
   * If promo code exists, is valid and still has uses left
   */
  static async assignPromoCodeCredits(
    event: {
      project_uuid: string;
      email: string;
    },
    context: ServiceContext,
  ) {
    const promoCodeUser = await new PromoCodeUser({}, context).populateByEmail(
      event.email,
    );

    // This email has not used any promo code
    if (!promoCodeUser.exists()) {
      return;
    }

    const promoCode = await new PromoCode({}, context).populateById(
      promoCodeUser.code_id,
    );

    if (!promoCode.exists()) {
      writeLog(LogType.ERROR, `Promo code ${promoCodeUser.code_id} not found`);
      return false;
    }

    const totalUses = await new PromoCodeUser({}, context).getNumberOfCodeUses(
      promoCode.id,
    );

    if (totalUses > promoCode.maxUses) {
      writeLog(
        LogType.INFO,
        `Promo code ${promoCode.code} has already reached max usage`,
      );
      return false;
    }

    if (promoCodeUser.exists()) {
      await new Scs(context).addCredit(
        new AddCreditDto({
          project_uuid: event.project_uuid,
          amount: promoCode.creditAmount,
          referenceTable: `${DbTables.PROMO_CODE}`,
          referenceId: promoCode.code,
        }),
      );
      return true;
    }
  }
}
