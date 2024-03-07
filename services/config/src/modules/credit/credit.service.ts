import { ServiceContext, getSerializationStrategy } from '@apillon/service-lib';
import { Credit } from './models/credit.model';
import {
  AddCreditDto,
  Ams,
  ConfigureCreditDto,
  CreditTransactionQueryFilter,
  EmailDataDto,
  EmailTemplate,
  Lmas,
  LogType,
  Mailing,
  PoolConnection,
  SerializeFor,
  ServiceName,
  SpendCreditDto,
} from '@apillon/lib';
import { ScsCodeException, ScsValidationException } from '../../lib/exceptions';
import { ConfigErrorCode, CreditDirection, DbTables } from '../../config/types';
import { CreditTransaction } from './models/credit-transaction.model';
import { Product } from '../product/models/product.model';
import { CreditPackage } from './models/credit-package.model';
import { SubscriptionPackage } from '../subscription/models/subscription-package.model';

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

    credit.canAccess(context, event.project_uuid);

    return credit.serialize(getSerializationStrategy(context));
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
   * @param {AddCreditDto} addCreditDto
   * @param {ServiceContext} context
   * @param {PoolConnection} connection
   * @returns {Promise<{ credit: Credit; creditTransaction: CreditTransaction }>}
   */
  static async addCredit(
    event: { body: AddCreditDto },
    context: ServiceContext,
    connection?: PoolConnection,
  ): Promise<{ credit: Credit; creditTransaction: CreditTransaction }> {
    let credit: Credit;
    let creditTransaction: CreditTransaction;
    const addCreditDto = event.body;
    const conn = connection || (await context.mysql.start());
    try {
      credit = await new Credit({}, context).populateByProjectUUIDForUpdate(
        addCreditDto.project_uuid,
        conn,
      );

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
        credit.lastAlertTime = null;
        await credit.update(SerializeFor.UPDATE_DB, conn);
      }

      creditTransaction = new CreditTransaction({}, context).populate({
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
      if (!connection) {
        await context.mysql.commit(conn);
      }
    } catch (err) {
      if (!connection) {
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
          errorMessage: err?.message,
          sourceFunction: 'addCredit()',
          sourceModule: 'CreditService',
        }).writeToMonitor({
          project_uuid: addCreditDto.project_uuid,
          data: new AddCreditDto(addCreditDto).serialize(SerializeFor.SERVICE),
          sendAdminAlert: true,
        });
      }
    }
    return {
      credit: credit.serialize(SerializeFor.SERVICE) as Credit,
      creditTransaction: creditTransaction.serialize(
        SerializeFor.SERVICE,
      ) as CreditTransaction,
    };
  }

  static async configureCredit(
    event: { body: ConfigureCreditDto },
    context: ServiceContext,
  ): Promise<any> {
    const credit = await new Credit({}, context).populateByProjectUUIDForUpdate(
      event.body.project_uuid,
      undefined,
    );

    if (!credit.exists()) {
      throw new ScsCodeException({
        code: ConfigErrorCode.PROJECT_CREDIT_NOT_FOUND,
        status: 404,
        context,
        sourceFunction: 'configureCredit()',
        sourceModule: 'CreditService',
      });
    }

    credit.canModify(context);

    credit.populate(event.body);
    await credit.update();

    return credit.serialize(getSerializationStrategy(context));
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
    if (product.currentPrice == null) {
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

      if (credit.balance < credit.threshold && !credit.lastAlertTime) {
        //Send email and set lastAlertTime property
        try {
          //Get project owner
          const projectOwner = (
            await new Ams(context).getProjectOwner(credit.project_uuid)
          ).data;

          if (projectOwner?.email) {
            //send email
            await new Mailing(context).sendMail(
              new EmailDataDto({
                mailAddresses: [projectOwner.email],
                templateName: EmailTemplate.CREDIT_BALANCE_BELOW_THRESHOLD,
              }),
            );
            credit.lastAlertTime = new Date();
          }
        } catch (err) {
          //Admin alert
          await new Lmas().writeLog({
            context,
            project_uuid: credit.project_uuid,
            logType: LogType.ERROR,
            message: 'Error notifying user that credit is below threshold',
            location: `CreditService.spendCredit()`,
            service: ServiceName.CONFIG,
            data: {
              credit: credit.serialize(SerializeFor.LOGGER),
            },
            sendAdminAlert: true,
          });
        }
      }

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
          code: ConfigErrorCode.ERROR_SPENDING_CREDIT,
          status: 500,
          context,
          sourceFunction: 'spendCredit()',
          sourceModule: 'CreditService',
        }).writeToMonitor({
          project_uuid: event.body.project_uuid,
          data: event.body,
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
    event: { referenceTable: string; referenceId: string; product_id?: number },
    context: ServiceContext,
  ): Promise<any> {
    //Check if spend creditTransaction exists for this reference
    const creditTransaction: CreditTransaction = await new CreditTransaction(
      {},
      context,
    ).populateRefundableTransaction(
      event.referenceTable,
      event.referenceId,
      event.product_id,
    );

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

  /**
   * Returns the credit package's stripe API ID for generating a payment URL through the Stripe SDK
   * @param {{ package_id: number; project_uuid: string }} { package_id, project_uuid }
   * @param {ServiceContext} context
   * @returns {Promise<string>}
   */
  static async getCreditPackageStripeId(
    { package_id, project_uuid }: { package_id: number; project_uuid: string },
    context: ServiceContext,
  ): Promise<string> {
    const creditPackage = await new CreditPackage({}, context).populateById(
      package_id,
    );

    if (!creditPackage?.stripeId) {
      throw await new ScsCodeException({
        code: ConfigErrorCode.STRIPE_ID_NOT_VALID,
        status: 500,
        errorCodes: ConfigErrorCode,
        sourceFunction: 'getCreditPackageStripeId',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({
        project_uuid,
        data: {
          creditPackage: new CreditPackage(creditPackage).serialize(),
        },
      });
    }

    return creditPackage.stripeId;
  }

  /**
   * Returns all active credit packages
   * @param {ServiceContext} context
   * @returns {Promise<string>}
   */
  static async getCreditPackages(
    event: any,
    context: ServiceContext,
  ): Promise<string> {
    return await new CreditPackage({}, context).getAll();
  }

  /**
   * Add credits to a new project from the freemium sub. package
   * @param {{ project_uuid: string }} { project_uuid }
   * @param {ServiceContext} context
   * @returns {Promise<boolean>}
   */
  static async addFreemiumCredits(
    { project_uuid }: { project_uuid: string },
    context: ServiceContext,
  ): Promise<boolean> {
    // Freemium package is always first, has ID=1
    const freemiumPackage = await new SubscriptionPackage(
      {},
      context,
    ).populateById(1);

    await CreditService.addCredit(
      {
        body: new AddCreditDto({
          project_uuid,
          amount: freemiumPackage.creditAmount,
          referenceTable: 'project',
          referenceId: project_uuid,
        }),
      },
      context,
    );
    return true;
  }
}
