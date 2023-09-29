import {
  AddCreditDto,
  CreateInvoiceDto,
  CreateSubscriptionDto,
  Merge,
  PoolConnection,
  SerializeFor,
  ServiceName,
  InvoicesQueryFilter,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Invoice } from './models/invoice.model';
import { SubscriptionService } from '../subscription/subscription.service';
import { ConfigErrorCode, DbTables } from '../../config/types';
import { CreditService } from '../credit/credit.service';
import { ScsCodeException, ScsValidationException } from '../../lib/exceptions';
import { CreditPackage } from '../credit/models/credit-package.model';

export class InvoiceService {
  /**
   * Get all invoices, existing or for a single project
   * @param {event: {query: InvoicesQueryFilter}} - Query filter for listing invoices
   */
  static async listInvoices(
    event: { query: InvoicesQueryFilter },
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
      if (
        err instanceof ScsCodeException ||
        err instanceof ScsValidationException
      ) {
        throw err;
      } else {
        throw await new ScsCodeException({
          code: ConfigErrorCode.ERROR_HANDLING_STRIPE_WEBHOOK,
          status: 500,
          context,
          errorMessage: err?.message,
          sourceFunction: 'handleStripeWebhookData()',
          sourceModule: 'InvoiceService',
        }).writeToMonitor({
          project_uuid: event.data.project_uuid,
          data: webhookData,
        });
      }
    }
    return true;
  }

  static async handleCreditPurchase(
    webhookData: Merge<
      Partial<AddCreditDto> & { package_id: number },
      Partial<CreateInvoiceDto>
    >,
    context: ServiceContext,
    conn: PoolConnection,
  ) {
    const creditPackage = await new CreditPackage({}, context).populateById(
      webhookData.package_id,
      conn,
    );

    if (!creditPackage?.exists()) {
      throw await new ScsCodeException({
        status: 404,
        code: ConfigErrorCode.CREDIT_PACKAGE_NOT_FOUND,
        sourceFunction: 'handleCreditPurchase',
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
        body: new AddCreditDto({
          ...webhookData,
          amount: creditPackage.creditAmount + creditPackage.bonusCredits,
          referenceTable: DbTables.INVOICE,
          referenceId: invoice.id,
        }),
      },
      context,
      conn,
    );
  }

  static async handleSubscriptionPurchase(
    webhookData: Merge<
      Partial<CreateSubscriptionDto>,
      Partial<CreateInvoiceDto>
    >,
    context: ServiceContext,
    conn: PoolConnection,
  ) {
    {
      const subscription = await SubscriptionService.createSubscription(
        new CreateSubscriptionDto(webhookData),
        context,
        conn,
      );
      await InvoiceService.createInvoice(
        new CreateInvoiceDto({
          ...webhookData,
          referenceTable: DbTables.SUBSCRIPTION,
          referenceId: subscription.id,
        }),
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
    const invoice = new Invoice(
      {
        ...createInvoiceDto,
        stripeId: createInvoiceDto.invoiceStripeId,
      },
      context,
    );
    try {
      await invoice.validate();
    } catch (err) {
      await invoice.handle(err);
      if (!invoice.isValid()) {
        throw new ScsValidationException(invoice);
      }
    }
    await invoice.insert(SerializeFor.INSERT_DB, conn);
    return invoice.serialize(SerializeFor.SERVICE) as Invoice;
  }
}
