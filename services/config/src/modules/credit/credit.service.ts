import { ServiceContext } from '@apillon/service-lib';
import { Credit } from './models/credit.model';
import {
  AddCreditDto,
  CreateInvoiceDto,
  CreditTransactionQueryFilter,
  Lmas,
  LogType,
  PoolConnection,
  SerializeFor,
  ServiceName,
  SpendCreditDto,
} from '@apillon/lib';
import { ScsCodeException, ScsValidationException } from '../../lib/exceptions';
import { ConfigErrorCode, CreditDirection, DbTables } from '../../config/types';
import { CreditTransaction } from './models/credit-transaction.model';
import { Product } from './models/product.model';
import { Invoice } from '../subscription/models/invoice.model';

/**
 * CreditService class for handling credit requests
 */
export class CreditService {
  /**
   * Return current credit (balance) for project
   * @param event
   * @param context
   * @returns
   */
  static async getCredit(
    event: { project_uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const credit: Credit = await new Credit({}, context).populateByUUID(
      event.project_uuid,
    );

    await credit.canAccess(context, event.project_uuid);

    return credit.serialize(SerializeFor.PROFILE);
  }

  /**
   * List transactions (credit traffic) for given project
   * @param event
   * @param context
   * @returns
   */
  static async listCreditTransactions(
    event: { query: CreditTransactionQueryFilter },
    context: ServiceContext,
  ): Promise<any> {
    return await new CreditTransaction(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(new CreditTransactionQueryFilter(event.query, context));
  }

  /**
   * Add credit to project.
   * @param {{ addCreditDto: AddCreditDto; createInvoiceDto?: CreateInvoiceDto }} event
   * @param {ServiceContext} context
   * @returns {Promise<boolean>}
   */
  static async addCredit(
    {
      addCreditDto,
      createInvoiceDto,
    }: { addCreditDto: AddCreditDto; createInvoiceDto?: CreateInvoiceDto },
    context: ServiceContext,
    poolConn?: PoolConnection,
  ): Promise<boolean> {
    const conn = poolConn || (await context.mysql.start());
    try {
      let credit: Credit = await new Credit(
        {},
        context,
      ).populateByProjectUUIDForUpdate(addCreditDto.project_uuid, conn);

      if (!credit.exists()) {
        //Credit record for project does not yet exists - create one
        credit = new Credit(
          {
            project_uuid: addCreditDto.project_uuid,
            balance: addCreditDto.amount,
          },
          context,
        );

        await credit.insert(SerializeFor.INSERT_DB, conn);
      } else {
        credit.balance += addCreditDto.amount;
        await credit.update(SerializeFor.UPDATE_DB, conn);
      }

      const creditTransaction: CreditTransaction = new CreditTransaction(
        {},
        context,
      ).populate({
        project_uuid: addCreditDto.project_uuid,
        credit_id: credit.id,
        direction: CreditDirection.RECEIVE,
        amount: addCreditDto.amount,
        referenceTable: addCreditDto.referenceTable,
        referenceId: addCreditDto.referenceId,
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

      if (createInvoiceDto) {
        await new Invoice(
          {
            ...createInvoiceDto,
            referenceId: creditTransaction.id,
            referenceTable: DbTables.CREDIT_TRANSACTION,
          },
          context,
        ).insert(SerializeFor.INSERT_DB, conn);
      }

      if (!poolConn) {
        await context.mysql.commit(conn);
      }

      await new Lmas().writeLog({
        context,
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
      if (!poolConn) {
        await context.mysql.rollback(conn);
      }

      if (
        err instanceof ScsCodeException ||
        err instanceof ScsValidationException
      ) {
        throw err;
      } else {
        throw await new ScsCodeException({
          code: ConfigErrorCode.ERROR_ADDING_CREDIT,
          status: 500,
          context,
          sourceFunction: 'addCredit()',
          sourceModule: 'CreditService',
        }).writeToMonitor({ project_uuid: addCreditDto.project_uuid });
      }
    }
    return true;
  }

  /**
   * Pay for product with credit.
   * @param event
   * @param context
   */
  static async spendCredit(
    event: { body: SpendCreditDto },
    context: ServiceContext,
  ): Promise<any> {
    try {
      event.body = new SpendCreditDto(event.body, context);
      await event.body.validate();
    } catch (err) {
      await event.body.handle(err);
      if (!event.body.isValid()) {
        throw new ScsValidationException(event.body);
      }
    }

    //Check product and populate it's price
    const product: Product = await new Product({}, context).populateById(
      event.body.product_id,
    );
    if (!product.exists()) {
      throw await new ScsCodeException({
        code: ConfigErrorCode.PRODUCT_DOES_NOT_EXISTS,
        status: 500,
        context,
        sourceFunction: 'spendCredit()',
        sourceModule: 'CreditService',
        errorMessage: 'Product does not exists',
      }).writeToMonitor({
        project_uuid: event.body.project_uuid,
        sendAdminAlert: true,
      });
    }

    await product.populateCurrentPrice();
    if (!product.currentPrice) {
      throw await new ScsCodeException({
        code: ConfigErrorCode.PRODUCT_PRICE_DOES_NOT_EXISTS,
        status: 500,
        context,
        sourceFunction: 'spendCredit()',
        sourceModule: 'CreditService',
      }).writeToMonitor({
        project_uuid: event.body.project_uuid,
        data: product.serialize(SerializeFor.LOGGER),
        sendAdminAlert: true,
      });
    }

    const conn = await context.mysql.start();
    try {
      const credit: Credit = await new Credit(
        {},
        context,
      ).populateByProjectUUIDForUpdate(event.body.project_uuid, conn);

      if (!credit.exists() || credit.balance < product.currentPrice) {
        throw await new ScsCodeException({
          code: ConfigErrorCode.CREDIT_BALANCE_TOO_LOW,
          status: 402,
          context,
          sourceFunction: 'spendCredit()',
          sourceModule: 'CreditService',
        }).writeToMonitor({ project_uuid: event.body.project_uuid });
      }

      credit.balance -= product.currentPrice;
      await credit.update(SerializeFor.UPDATE_DB, conn);

      const creditTransaction: CreditTransaction = new CreditTransaction(
        {},
        context,
      ).populate({
        project_uuid: event.body.project_uuid,
        credit_id: credit.id,
        product_id: product.id,
        direction: CreditDirection.SPEND,
        amount: product.currentPrice,
        referenceTable: event.body.referenceTable,
        referenceId: event.body.referenceId,
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
        context,
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

      if (
        err instanceof ScsCodeException ||
        err instanceof ScsValidationException
      ) {
        throw err;
      } else {
        throw await new ScsCodeException({
          code: ConfigErrorCode.ERROR_ADDING_CREDIT,
          status: 500,
          context,
          sourceFunction: 'addCredit()',
          sourceModule: 'CreditService',
        }).writeToMonitor({
          project_uuid: event.body.project_uuid,
          sendAdminAlert: true,
        });
      }
    }
    return true;
  }

  /**
   * If some action which was paid with credits fail, this function returns credits to project
   * @param event referenceTable and referenceId
   * @param context
   */
  static async refundCredit(
    event: { referenceTable: string; referenceId: string },
    context: ServiceContext,
  ): Promise<any> {
    //Check if spend creditTransaction exists for this reference
    const creditTransaction: CreditTransaction = await new CreditTransaction(
      {},
      context,
    ).populateRefundableTransaction(event.referenceTable, event.referenceId);

    if (!creditTransaction.exists()) {
      throw await new ScsCodeException({
        code: ConfigErrorCode.CREDIT_TRANSACTION_FOR_REFUND_NOT_EXISTS_OR_REFUNDED,
        status: 500,
        context,
        sourceFunction: 'refundCredit()',
        sourceModule: 'CreditService',
      }).writeToMonitor({
        data: {
          referenceTable: event.referenceTable,
          referenceId: event.referenceId,
        },
        sendAdminAlert: true,
      });
    }

    const conn = await context.mysql.start();
    try {
      const credit: Credit = await new Credit(
        {},
        context,
      ).populateByProjectUUIDForUpdate(creditTransaction.project_uuid, conn);

      credit.balance += creditTransaction.amount;
      await credit.update(SerializeFor.UPDATE_DB, conn);

      const refundCreditTransaction: CreditTransaction = new CreditTransaction(
        {},
        context,
      ).populate({
        project_uuid: creditTransaction.project_uuid,
        credit_id: credit.id,
        product_id: creditTransaction.product_id,
        direction: CreditDirection.RECEIVE,
        amount: creditTransaction.amount,
        referenceTable: creditTransaction.referenceTable,
        referenceId: creditTransaction.referenceId,
      });

      try {
        await refundCreditTransaction.validate();
      } catch (err) {
        await refundCreditTransaction.handle(err);
        if (!refundCreditTransaction.isValid()) {
          throw new ScsValidationException(refundCreditTransaction);
        }
      }
      await refundCreditTransaction.insert(SerializeFor.INSERT_DB, conn);

      await context.mysql.commit(conn);

      await new Lmas().writeLog({
        context,
        project_uuid: credit.project_uuid,
        logType: LogType.INFO,
        message: 'Credit transaction refunded',
        location: `CreditService.refundCredit()`,
        service: ServiceName.CONFIG,
        data: {
          credit: credit.serialize(SerializeFor.LOGGER),
          creditTransaction: refundCreditTransaction.serialize(
            SerializeFor.LOGGER,
          ),
        },
      });
    } catch (err) {
      await context.mysql.rollback(conn);

      if (
        err instanceof ScsCodeException ||
        err instanceof ScsValidationException
      ) {
        throw err;
      } else {
        throw await new ScsCodeException({
          code: ConfigErrorCode.ERROR_REFUNDING_CREDIT_TRANSACTION,
          status: 500,
          context,
          sourceFunction: 'refundCredit()',
          sourceModule: 'CreditService',
        }).writeToMonitor({
          project_uuid: creditTransaction?.project_uuid,
          data: {
            referenceTable: event.referenceTable,
            referenceId: event.referenceId,
          },
          sendAdminAlert: true,
        });
      }
    }
    return true;
  }
}
