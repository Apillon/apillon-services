import { ServiceContext } from '@apillon/service-lib';
import { Credit } from './models/credit.model';
import { Lmas, LogType, SerializeFor, ServiceName } from '@apillon/lib';
import { ScsCodeException, ScsValidationException } from '../../lib/exceptions';
import { ConfigErrorCode } from '../../config/types';
import { CreditTransaction } from './models/credit-transaction.model';
import { Product } from './models/product.model';

/**
 * CreditService class for handling credit requests
 */
export class CreditService {
  static async addCredit(data: any, context: ServiceContext): Promise<any> {
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

      const creditTransaction: CreditTransaction = new CreditTransaction(
        {},
        context,
      ).populate({
        project_uuid: data.project_uuid,
        credit_id: credit.id,
        direction: 1,
        amount: data.amount,
        referenceTable: data.referenceTable,
        referenceId: data.referenceId,
      });

      try {
        await creditTransaction.validate();
      } catch (err) {
        await creditTransaction.handle(err);
        if (!creditTransaction.isValid()) {
          throw new ScsValidationException(creditTransaction);
        }
      }
      await creditTransaction.insert(SerializeFor.INSERT_DB, conn);

      await context.mysql.commit(conn);

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

  static async spendCredit(data: any, context: ServiceContext): Promise<any> {
    //Check product and populate it's price
    const product: Product = await new Product({}, context).populateById(
      data.product_id,
    );
    if (!product.exists()) {
      throw await new ScsCodeException({
        code: ConfigErrorCode.PRODUCT_DOES_NOT_EXISTS,
        status: 500,
        context: context,
        sourceFunction: 'spendCredit()',
        sourceModule: 'CreditService',
      }).writeToMonitor({ project_uuid: data.project_uuid });
    }

    await product.populateCurrentPrice();
    if (!product.currentPrice) {
      throw await new ScsCodeException({
        code: ConfigErrorCode.PRODUCT_PRICE_DOES_NOT_EXISTS,
        status: 500,
        context: context,
        sourceFunction: 'spendCredit()',
        sourceModule: 'CreditService',
      }).writeToMonitor({
        project_uuid: data.project_uuid,
        data: product.serialize(SerializeFor.LOGGER),
      });
    }

    const conn = await context.mysql.start();
    try {
      const credit: Credit = await new Credit(
        {},
        context,
      ).populateByProjectUUIDForUpdate(data.project_uuid, conn);

      if (!credit.exists() || credit.balance < product.currentPrice) {
        throw await new ScsCodeException({
          code: ConfigErrorCode.CREDIT_BALANCE_TOO_LOW,
          status: 402,
          context: context,
          sourceFunction: 'spendCredit()',
          sourceModule: 'CreditService',
        }).writeToMonitor({ project_uuid: data.project_uuid });
      }

      credit.balance -= data.amount;
      await credit.update(SerializeFor.UPDATE_DB, conn);

      const creditTransaction: CreditTransaction = new CreditTransaction(
        {},
        context,
      ).populate({
        project_uuid: data.project_uuid,
        credit_id: credit.id,
        product_id: product.id,
        direction: 2,
        amount: product.currentPrice,
        referenceTable: data.referenceTable,
        referenceId: data.referenceId,
      });

      try {
        await creditTransaction.validate();
      } catch (err) {
        await creditTransaction.handle(err);
        if (!creditTransaction.isValid()) {
          throw new ScsValidationException(creditTransaction);
        }
      }
      await creditTransaction.insert(SerializeFor.INSERT_DB, conn);

      await context.mysql.commit(conn);

      await new Lmas().writeLog({
        context: context,
        project_uuid: credit.project_uuid,
        logType: LogType.INFO,
        message: 'Credit balance reduced',
        location: `CreditService.spendCredit()`,
        service: ServiceName.CONFIG,
        data: {
          credit: credit.serialize(SerializeFor.LOGGER),
        },
      });
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
}
