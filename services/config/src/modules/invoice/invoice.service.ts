import {
  AddCreditDto,
  CreateInvoiceDto,
  CreateSubscriptionDto,
  Lmas,
  LogType,
  Merge,
  PoolConnection,
  SerializeFor,
  ServiceName,
  SubscriptionsQueryFilter,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Invoice } from './models/invoice.model';
import { SubscriptionService } from '../subscription/subscription.service';
import { ConfigErrorCode, DbTables } from '../../config/types';
import { CreditService } from '../credit/credit.service';
import { ScsCodeException } from '../../lib/exceptions';

export class InvoiceService {
  /**
   * Get all invoices, existing or for a single project
   * @param {event: {query: SubscriptionsQueryFilter}} - Query filter for listing invoices
   */
  static async listInvoices(
    event: { query: SubscriptionsQueryFilter },
    context: ServiceContext,
  ) {
    return await new Invoice({
      project_uuid: event.query.project_uuid,
    }).getList(event.query, context);
  }

  /**
   * Handle stripe purchases, either credit purchase or subscription
   * Creates new subscription/credit records and a new invoice
   * @async
   * @param {{
        data: Merge<
          Partial<CreateSubscriptionDto> & Partial<AddCreditDto>,
          Partial<CreateInvoiceDto>
        >;
      }} event - Stripe webhook data
   * @param {ServiceContext} context
   * @returns {Promise<boolean>}
   */
  static async handleStripeWebhookData(
    event: {
      data: Merge<
        Partial<CreateSubscriptionDto> & Partial<AddCreditDto>,
        Partial<CreateInvoiceDto>
      >;
    },
    context: ServiceContext,
  ): Promise<boolean> {
    // Contains all subscription/credit and invoice create data
    const webhookData = event.data as any;
    const conn = await context.mysql.start();

    try {
      if (webhookData.isCreditPurchase) {
        await InvoiceService.handleCreditPurchase(webhookData, context, conn);
      } else {
        await InvoiceService.handleSubscriptionPurchase(
          webhookData,
          context,
          conn,
        );
      }
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      await new Lmas().writeLog({
        context,
        project_uuid: webhookData.project_uuid,
        logType: LogType.ERROR,
        message: 'Error while handling stripe webhook data',
        location: 'InvoiceService.handleStripeWebhookData()',
        service: ServiceName.CONFIG,
        data: {
          webhookData,
          err,
        },
      });
    }
    return true;
  }

  static async handleCreditPurchase(
    webhookData: any,
    context: ServiceContext,
    conn: PoolConnection,
  ) {
    const creditPackage = await CreditService.getCreditPackageById(
      { id: webhookData.package_id },
      context,
    );

    if (!creditPackage?.exists()) {
      throw await new ScsCodeException({
        status: 404,
        code: ConfigErrorCode.SUBSCRIPTION_PACKAGE_NOT_FOUND,
        sourceFunction: 'createSubscription',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({
        context,
        data: { package_id: webhookData.package_id },
      });
    }

    const invoice = await InvoiceService.createInvoice(
      {
        ...webhookData,
        referenceTable: DbTables.CREDIT_PACKAGE,
        referenceId: creditPackage.id,
      },
      context,
      conn,
    );

    await CreditService.addCredit(
      {
        ...webhookData,
        amount: creditPackage.creditAmount + creditPackage.bonusCredits,
        referenceTable: DbTables.INVOICE,
        referenceId: invoice.id,
      },
      context,
      conn,
    );
  }

  static async handleSubscriptionPurchase(
    webhookData: any,
    context: ServiceContext,
    conn: PoolConnection,
  ) {
    {
      const subscription = await SubscriptionService.createSubscription(
        webhookData,
        context,
        conn,
      );
      await InvoiceService.createInvoice(
        {
          ...webhookData,
          referenceTable: DbTables.SUBSCRIPTION,
          referenceId: subscription.id,
        },
        context,
        conn,
      );
    }
  }

  /**
   * Inserts a new invoice in the DB
   * @param {(CreateInvoiceDto | any)} createInvoiceDto
   * @param {ServiceContext} context
   * @param {PoolConnection} conn
   * @returns {Promise<Invoice>}
   */
  static async createInvoice(
    createInvoiceDto: CreateInvoiceDto | any,
    context: ServiceContext,
    conn: PoolConnection,
  ): Promise<Invoice> {
    const newInvoice = await new Invoice(
      {
        ...createInvoiceDto,
        stripeId: createInvoiceDto.invoiceStripeId,
      },
      context,
    ).insert(SerializeFor.INSERT_DB, conn);
    return newInvoice.serialize(SerializeFor.SERVICE) as Invoice;
  }
}
