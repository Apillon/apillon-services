import { ServiceContext } from '@apillon/service-lib';
import { Credit } from './models/credit.model';
import { Lmas, LogType, SerializeFor, ServiceName } from '@apillon/lib';
import { ScsCodeException } from '../../lib/exceptions';
import { ConfigErrorCode } from '../../config/types';

/**
 * CreditService class for handling credit requests
 */
export class CreditService {
  private static async addCredit(
    data: any,
    context: ServiceContext,
  ): Promise<any> {
    const conn = await context.mysql.start();
    try {
      let credit: Credit = await new Credit(
        {},
        context,
      ).populateByProjectUUIDForUpdate(data.project_uuid, conn);

      if (!credit.exists()) {
        //Credit record for project does not yet exists - create one
        credit = new Credit(
          {
            project_uuid: data.project_uuid,
            balance: data.amount,
          },
          context,
        );

        await credit.insert(SerializeFor.INSERT_DB, conn);
      } else {
        credit.balance += data.amount;
        await credit.update(SerializeFor.UPDATE_DB, conn);
      }

      await new Lmas().writeLog({
        context: context,
        project_uuid: credit.project_uuid,
        logType: LogType.INFO,
        message: 'Credit balance increased',
        location: `CreditService.addCredit()`,
        service: ServiceName.CONFIG,
        data: {
          credit: credit.serialize(SerializeFor.LOGGER),
        },
      });

      //TODO --> Write to CreditTransaction table
    } catch (err) {
      await context.mysql.rollback(conn);

      if (err instanceof ScsCodeException) {
        throw err;
      } else {
        throw await new ScsCodeException({
          code: ConfigErrorCode.ERROR_ADDING_CREDIT,
          status: 500,
          context: context,
          sourceFunction: 'addCredit()',
          sourceModule: 'CreditService',
        }).writeToMonitor({ project_uuid: data.project_uuid });
      }
    }
  }

  private static async spendCredit(
    data: any,
    context: ServiceContext,
  ): Promise<any> {
    //todo
  }
}
