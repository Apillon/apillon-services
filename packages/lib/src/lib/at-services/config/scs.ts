import { env } from '../../../config/env';
import { AppEnvironment, ScsEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateQuotaOverrideDto } from './dtos/create-quota-override.dto';
import { QuotaOverrideDto } from './dtos/quota-override.dto';
import { QuotaDto } from './dtos/quota.dto';
import { TermsDto } from './dtos/terms.dto';
import { GetQuotaDto } from './dtos/get-quota.dto';
import { CreditTransactionQueryFilter } from './dtos/credit-transaction-query-filter.dto';
import { AddCreditDto } from './dtos/add-credit.dto';
import { SpendCreditDto } from './dtos/spend-credit.dto';

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

  public async addCredit(body: AddCreditDto): Promise<any> {
    const data = {
      eventName: ScsEventType.ADD_CREDIT,
      body,
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

  public async refundCredit(
    referenceTable: string,
    referenceId: string,
  ): Promise<any> {
    const data = {
      eventName: ScsEventType.REFUND_CREDIT,
      referenceTable,
      referenceId,
    };

    return await this.callService(data);
  }

  //#endregion
}
