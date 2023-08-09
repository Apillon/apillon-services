import { GetQuotaDto, QuotaDto } from '@apillon/lib';
import { ConfigErrorCode } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { ScsCodeException } from '../../lib/exceptions';
import { Quota } from './models/quota.model';
/**
 * QuotaService class for handling quota requests
 */
export class QuotaService {
  /**
   * Get the quota for a specific project and object.
   * @param {GetQuotaDto} data - The data containing quota ID, project UUID, and object UUID.
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<QuotaDto>} - The quota data.
   * @throws {ScsCodeException} - If the quota is not found.
   */
  static async getQuota(
    data: GetQuotaDto,
    context: ServiceContext,
  ): Promise<QuotaDto> {
    const res = await QuotaService.queryQuotas(data, context);

    if (!res.length) {
      throw new ScsCodeException({
        status: 404,
        code: ConfigErrorCode.QUOTA_NOT_FOUND,
      });
    }

    return res[0];
  }

  /**
   * Get all quotas for a specific project or object.
   * @param {GetQuotaDto} data - The data containing quota ID, project UUID, and object UUID.
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<QuotaDto[]>} - The quota data.
   */
  static async getQuotas(
    data: GetQuotaDto,
    context: ServiceContext,
  ): Promise<QuotaDto[]> {
    return await QuotaService.queryQuotas(data, context);
  }

  /**
   * Query database for quota(s) based on given parameters
   * @param {GetQuotaDto} data
   * @param {ServiceContext} context
   * @returns {Promise<QuotaDto[]>}
   */
  private static async queryQuotas(
    data: GetQuotaDto,
    context: ServiceContext,
  ): Promise<QuotaDto[]> {
    return await new Quota({}, context).getQuotas(data);
  }
}
