import { CreateSubscriptionDto } from './dtos/create-subscription.dto';
import { env } from '../../../config/env';
import {
  AppEnvironment,
  Merge,
  ProductCode,
  ScsEventType,
} from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateQuotaOverrideDto } from './dtos/create-quota-override.dto';
import { QuotaOverrideDto } from './dtos/quota-override.dto';
import { QuotaDto } from './dtos/quota.dto';
import { GetQuotaDto } from './dtos/get-quota.dto';
import { CreditTransactionQueryFilter } from './dtos/credit-transaction-query-filter.dto';
import { AddCreditDto } from './dtos/add-credit.dto';
import { SpendCreditDto } from './dtos/spend-credit.dto';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { SubscriptionsQueryFilter } from './dtos/subscriptions-query-filter.dto';
import { InvoicesQueryFilter } from './dtos/invoices-query-filter.dto';
import { UpdateSubscriptionDto } from './dtos/update-subscription.dto';
import { PricelistQueryFilter } from './dtos/pricelist-query-filter.dto';
import { ConfigureCreditDto } from './dtos/configure-credit.dto';

/**
 * System config Service client
 */
export class Scs extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONFIG_FUNCTION_NAME_TEST
      : env.CONFIG_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONFIG_SOCKET_PORT_TEST
      : env.CONFIG_SOCKET_PORT;
  serviceName = 'SCS';

  constructor(context?: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  public async getQuota(params: {
    quota_id: number;
    project_uuid?: string;
    object_uuid?: string;
  }): Promise<QuotaDto> {
    const data = {
      eventName: ScsEventType.GET_QUOTA,
      ...params,
    };

    const scsResponse = await this.callService(data);

    return new QuotaDto().populate(scsResponse.data);
  }

  public async getQuotas(params: GetQuotaDto): Promise<QuotaDto[]> {
    const data = {
      eventName: ScsEventType.GET_ALL_QUOTAS,
      ...params,
    };

    const { data: scsResponseData } = await this.callService(data);

    return scsResponseData;
  }

  public async createOverride(dto: CreateQuotaOverrideDto): Promise<any> {
    const data = {
      eventName: ScsEventType.CREATE_OVERRIDE,
      ...dto,
    };

    return await this.callService(data);
  }

  public async deleteOverride(dto: QuotaOverrideDto): Promise<QuotaDto[]> {
    const data = {
      eventName: ScsEventType.DELETE_OVERRIDE,
      ...dto,
    };

    return await this.callService(data);
  }

  //#region credit

  public async getProjectCredit(project_uuid: string): Promise<any> {
    const data = {
      eventName: ScsEventType.GET_PROJECT_CREDIT,
      project_uuid,
    };

    return await this.callService(data);
  }

  public async getCreditTransactions(
    query: CreditTransactionQueryFilter,
  ): Promise<any> {
    const data = {
      eventName: ScsEventType.GET_CREDIT_TRANSACTIONS,
      query,
    };

    return await this.callService(data);
  }

  public async addCredit(addCreditDto: AddCreditDto): Promise<any> {
    const data = {
      eventName: ScsEventType.ADD_CREDIT,
      body: addCreditDto.serialize(),
    };

    return await this.callService(data);
  }

  public async configureCredit(body: ConfigureCreditDto): Promise<any> {
    const data = {
      eventName: ScsEventType.CONFIGURE_CREDIT,
      body: body.serialize(),
    };

    return await this.callService(data);
  }

  public async spendCredit(body: SpendCreditDto): Promise<any> {
    const data = {
      eventName: ScsEventType.SPEND_CREDIT,
      body,
    };

    return await this.callService(data);
  }

  /**
   * Refund credit for failed operation
   * @param referenceTable
   * @param referenceId
   * @param product_id Optional specification of product_id. Mandatory where multiple products can point to the same reference.
   * @returns
   */
  public async refundCredit(
    referenceTable: string,
    referenceId: string,
    product_id?: ProductCode,
  ): Promise<any> {
    const data = {
      eventName: ScsEventType.REFUND_CREDIT,
      referenceTable,
      referenceId,
      product_id,
    };

    return await this.callService(data);
  }

  public async getCreditPackageStripeId(
    package_id: number,
    project_uuid: string,
  ) {
    return await this.callService({
      eventName: ScsEventType.GET_CREDIT_PACKAGE_STRIPE_ID,
      package_id,
      project_uuid,
    });
  }

  public async getCreditPackages() {
    return await this.callService({
      eventName: ScsEventType.GET_CREDIT_PACKAGES,
    });
  }

  public async addFreemiumCredits(project_uuid: string) {
    return await this.callService({
      eventName: ScsEventType.ADD_FREEMIUM_CREDITS,
      project_uuid,
    });
  }

  //#endregion

  //#region subscriptions

  public async handlePaymentWebhookData(
    data: Merge<
      Partial<CreateSubscriptionDto> & Partial<AddCreditDto>,
      Partial<CreateInvoiceDto>
    >,
  ) {
    return await this.callService({
      eventName: ScsEventType.HANDLE_PAYMENT_WEBHOOK_DATA,
      data,
    });
  }

  public async getSubscriptionPackageStripeId(
    package_id: number,
    project_uuid?: string,
  ) {
    return await this.callService({
      eventName: ScsEventType.GET_SUBSCRIPTION_PACKAGE_STRIPE_ID,
      package_id,
      project_uuid,
    });
  }

  public async updateSubscription(
    updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return await this.callService({
      eventName: ScsEventType.UPDATE_SUBSCRIPTION,
      updateSubscriptionDto,
    });
  }

  public async getProjectActiveSubscription(project_uuid: string) {
    return await this.callService({
      eventName: ScsEventType.GET_ACTIVE_SUBSCRIPTION,
      project_uuid,
    });
  }

  public async listSubscriptions(query: SubscriptionsQueryFilter) {
    return await this.callService({
      eventName: ScsEventType.LIST_SUBSCRIPTIONS,
      query,
    });
  }

  public async hasProjectActiveRpcPlan(project_uuid: string | string[]) {
    return await this.callService({
      eventName: ScsEventType.HAS_ACTIVE_RPC_PLAN,
      project_uuid,
    });
  }

  public async getProjectsWithActiveSubscription(
    subscriptionPackageId?: number,
  ) {
    return await this.callService({
      eventName: ScsEventType.GET_PROJECTS_WITH_ACTIVE_SUBSCRIPTION,
      subscriptionPackageId,
    });
  }

  public async listInvoices(query: InvoicesQueryFilter) {
    return await this.callService({
      eventName: ScsEventType.LIST_INVOICES,
      query,
    });
  }

  public async getSubscriptionPackages() {
    return await this.callService({
      eventName: ScsEventType.GET_SUBSCRIPTION_PACKAGES,
    });
  }
  //#endregion

  //#region products

  public async getProductPricelist(query: PricelistQueryFilter) {
    return await this.callService({
      eventName: ScsEventType.GET_PRODUCT_PRICELIST,
      query,
    });
  }

  public async getProductPrice(product_id: number) {
    return await this.callService({
      eventName: ScsEventType.GET_PRODUCT_PRICE,
      product_id,
    });
  }

  //#endregion
}
