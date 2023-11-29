import { ServiceContext } from '@apillon/service-lib';
import { PromoCode } from './models/promo-code.model';
import { AddCreditDto, Lmas, LogType, Scs, ServiceName } from '@apillon/lib';
import { PromoCodeUser } from './models/promo-code-user.model';
import { DbTables } from '../../config/types';

export class PromoCodeService {
  /**
   * Assign promo code credits to a project
   * If promo code exists, is valid and still has uses left
   */
  static async addPromoCodeCredits(
    event: {
      project_uuid: string;
      email: string;
    },
    context: ServiceContext,
  ) {
    const writeLmasLog = async (
      message: string,
      logType = LogType.ERROR,
      data = {},
      sendAdminAlert = false,
    ) =>
      await new Lmas().writeLog({
        context,
        project_uuid: event.project_uuid,
        logType,
        message,
        user_uuid: context.user?.user_uuid,
        location: 'ReferralMS/PromoCodeService/addPromoCodeCredits',
        service: ServiceName.REFERRAL,
        data,
        sendAdminAlert,
      });

    try {
      const promoCodeUser = await new PromoCodeUser(
        {},
        context,
      ).populateByEmail(event.email);

      // This email has not used any promo code
      if (!promoCodeUser.exists()) {
        return;
      }

      const promoCode = await new PromoCode({}, context).populateById(
        promoCodeUser.code_id,
      );

      if (!promoCode.exists()) {
        await writeLmasLog(
          `Promo code ID=${promoCodeUser.code_id} not found`,
          LogType.ERROR,
          { ...event },
          true,
        );
        return false;
      }

      const totalUses = await new PromoCodeUser(
        {},
        context,
      ).getNumberOfCodeUses(promoCode.id);

      if (totalUses > promoCode.maxUses) {
        await writeLmasLog(
          `Promo code ${promoCode.code} has already reached max usage`,
        );
        return false;
      }

      await writeLmasLog(
        `Assigning ${promoCode.creditAmount} credits to ${event.email} for using promo code ${promoCode.code}`,
        LogType.INFO,
      );

      await new Scs(context).addCredit(
        new AddCreditDto({
          project_uuid: event.project_uuid,
          amount: promoCode.creditAmount,
          referenceTable: `${DbTables.PROMO_CODE}`,
          referenceId: promoCode.code,
        }),
      );
      return true;
    } catch (err) {
      await writeLmasLog(
        `Error adding promo code credits to project ${event.project_uuid} and email ${event.email}: ${err.message}`,
        LogType.ERROR,
        { ...event, err },
        true,
      );
      return false;
    }
  }
}
