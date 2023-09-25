import { CreateSubscriptionDto } from './dtos/create-subscription.dto';
import { env } from '../../../config/env';
import {
  AppEnvironment,
  ScsEventType,
  SubscriptionPackages,
} from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateQuotaOverrideDto } from './dtos/create-quota-override.dto';
import { QuotaOverrideDto } from './dtos/quota-override.dto';
import { QuotaDto } from './dtos/quota.dto';
import { TermsDto } from './dtos/terms.dto';
import { GetQuotaDto } from './dtos/get-quota.dto';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { SubscriptionsQueryFilter } from './dtos/subscriptions-query-filter.dto';

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

  public async getActiveTerms(): Promise<Array<TermsDto>> {
    const data = {
      eventName: ScsEventType.GET_ACTIVE_TERMS,
    };

    const scsResponse = await this.callService(data);

    return scsResponse.data.map((x) => new TermsDto().populate(x));
  }

  public async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
  ) {
    return await this.callService({
      eventName: ScsEventType.CREATE_SUBSCRIPTION,
      createSubscriptionDto,
    });
  }

  public async getSubscriptionPackageById(id: number) {
    return await this.callService({
      eventName: ScsEventType.GET_SUBSCRIPTION_PACKAGE_BY_ID,
      id,
    });
  }

  public async getSubscriptionPackageStripeId(
    package_id: number,
    project_uuid: string,
  ) {
    return await this.callService({
      eventName: ScsEventType.GET_SUBSCRIPTION_PACKAGE_STRIPE_ID,
      package_id,
      project_uuid,
    });
  }

  public async updateSubscription(subscriptionStripeId: string, data: any) {
    return await this.callService({
      eventName: ScsEventType.UPDATE_SUBSCRIPTION,
      subscriptionStripeId,
      data,
    });
  }

  public async listSubscriptions(query: SubscriptionsQueryFilter) {
    return await this.callService({
      eventName: ScsEventType.LIST_SUBSCRIPTIONS,
      query,
    });
  }

  public async listInvoices(query: SubscriptionsQueryFilter) {
    return await this.callService({
      eventName: ScsEventType.LIST_INVOICES,
      query,
    });
  }
}
