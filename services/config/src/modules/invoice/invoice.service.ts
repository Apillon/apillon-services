import {
  AddCreditDto,
  CreateInvoiceDto,
  CreateSubscriptionDto,
  Merge,
  PoolConnection,
  SerializeFor,
  ServiceName,
  InvoicesQueryFilter,
  UpdateSubscriptionDto,
  Lmas,
  LogType,
  SubscriptionPackageId,
  InfrastructureMicroservice,
  DwellirSubscription,
  CreateQuotaOverrideDto,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Invoice } from './models/invoice.model';
import { SubscriptionService } from '../subscription/subscription.service';
import { ConfigErrorCode, DbTables } from '../../config/types';
import { CreditService } from '../credit/credit.service';
import { ScsCodeException, ScsValidationException } from '../../lib/exceptions';
import { CreditPackage } from '../credit/models/credit-package.model';
import { Subscription } from '../subscription/models/subscription.model';
import { v4 as uuidV4 } from 'uuid';
import { OverrideService } from '../override/override.service';

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
   * Handle stripe or crypto payments, either credit purchase or subscription
   * Creates new subscription/credit records and a new invoice
   * @async
   * @param - data: Merge<
          Partial<CreateSubscriptionDto> & Partial<AddCreditDto>,
          Partial<CreateInvoiceDto>
        > event - Stripe webhook data
   * @param {ServiceContext} context
   * @returns {Promise<boolean>}
   */
  static async handlePaymentWebhookData(
    event: {
      data: Merge<
        Partial<CreateSubscriptionDto> & Partial<AddCreditDto>,
        Partial<CreateInvoiceDto>
      >;
    },
    context: ServiceContext,
  ): Promise<Invoice> {
    // Contains all subscription/credit and invoice create data
    const webhookData = event.data as any;
    const conn = await context.mysql.start();
    let invoice: Invoice;
    try {
      invoice = webhookData.isCreditPurchase
        ? await InvoiceService.handleCreditPurchase(webhookData, context, conn)
        : await InvoiceService.handleSubscriptionPurchase(
            webhookData,
            context,
            conn,
          );
      await context.mysql.commit(conn);

      return invoice;
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
          sendAdminAlert: true,
        });
      }
    }
  }

  static async handleCreditPurchase(
    webhookData: Merge<
      Partial<AddCreditDto> & { package_id: number },
      Partial<CreateInvoiceDto>
    >,
    context: ServiceContext,
    conn: PoolConnection,
  ): Promise<Invoice> {
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
        ...(webhookData as any),
        referenceTable: DbTables.CREDIT_PACKAGE,
        referenceId: `${creditPackage.id}`,
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

    return invoice;
  }

  static async handleSubscriptionPurchase(
    webhookData: Merge<
      Partial<CreateSubscriptionDto>,
      Partial<CreateInvoiceDto>
    >,
    context: ServiceContext,
    conn: PoolConnection,
  ): Promise<Invoice> {
    {
      const subscription = await SubscriptionService.createSubscription(
        new CreateSubscriptionDto(webhookData),
        context,
        conn,
      );

      if (webhookData.package_id === SubscriptionPackageId.RPC_PLAN) {
        const infrastructureMS = new InfrastructureMicroservice(context);
        await infrastructureMS.changeDwellirSubscription(
          DwellirSubscription.DEVELOPER,
        );
      }

      return await InvoiceService.createInvoice(
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
   * @param {(CreateInvoiceDto)} createInvoiceDto
   * @param {ServiceContext} context
   * @param {PoolConnection} conn
   * @returns {Promise<Invoice>}
   */
  static async createInvoice(
    createInvoiceDto: CreateInvoiceDto,
    context: ServiceContext,
    conn: PoolConnection,
  ): Promise<Invoice> {
    const invoice = new Invoice(
      {
        invoice_uuid: uuidV4(),
        ...createInvoiceDto,
        stripeId: createInvoiceDto.invoiceStripeId,
      },
      context,
    );

    await invoice.validateOrThrow(ScsValidationException);
    await invoice.insert(SerializeFor.INSERT_DB, conn);
    return invoice.serialize(SerializeFor.SERVICE) as Invoice;
  }

  /**
   * If same subscription package has been renewed or upgraded
   * Create cloned invoice with new data
   * @param {ServiceContext} context
   * @param {Subscription} subscription - Existing subscription
   * @param {UpdateSubscriptionDto} updateSubscriptionDto - DTO with updated data for subscription
   * @param {?PoolConnection} [conn]
   * @returns {*}
   */
  static async createOnSubscriptionUpdate(
    context: ServiceContext,
    subscription: Subscription,
    updateSubscriptionDto: UpdateSubscriptionDto,
    conn?: PoolConnection,
  ) {
    const existingInvoice = await new Invoice(
      {},
      context,
    ).populateByProjectSubscription(subscription.project_uuid, conn);

    if (existingInvoice.exists()) {
      // Create clone of existing invoice with updated data
      existingInvoice.populate({
        stripeId:
          updateSubscriptionDto.invoiceStripeId || existingInvoice.stripeId,
        totalAmount:
          updateSubscriptionDto.amount || existingInvoice.totalAmount,
        subtotalAmount:
          updateSubscriptionDto.amount || existingInvoice.subtotalAmount,
        referenceId: subscription.id,
        invoice_uuid: uuidV4(),
      });
      await existingInvoice.insert(SerializeFor.INSERT_DB, conn);
    } else {
      // Existing invoice for existing subscription must always exist, send alert if that is not the case
      await new Lmas().writeLog({
        context,
        logType: LogType.WARN,
        message: `New invoice not created for subscription renewal`,
        location: 'SCS/SubscriptionService/updateSubscription',
        project_uuid: subscription.project_uuid,
        service: ServiceName.CONFIG,
        data: {
          subcription: subscription.serialize(SerializeFor.SERVICE),
          updateSubscriptionDto: new UpdateSubscriptionDto(
            updateSubscriptionDto,
          ).serialize(),
        },
        sendAdminAlert: true,
      });
    }
  }
}
