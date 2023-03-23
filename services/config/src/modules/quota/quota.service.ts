import { GetQuotaDto, SqlModelStatus } from '@apillon/lib';
import { ConfigErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import { ScsCodeException } from '../../lib/exceptions';
/**
 * QuotaService class for handling quota requests
 */
export class QuotaService {
  /**
   * Get the quota for a specific project and object.
   * @param {GetQuotaDto} data - The data containing quota ID, project UUID, and object UUID.
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<any>} - The quota data.
   * @throws {ScsCodeException} - If the quota is not found.
   */
  static async getQuota(data: GetQuotaDto, context: ServiceContext) {
    console.log(data, context);

    const res = await context.mysql.paramExecute(
      `
      SELECT q.id,
        q.groupName, q.name, q.description,
        CASE WHEN q.valueType = 2 
        THEN 
          MIN(LEAST(q.value, IFNULL(o1.value,999), IFNULL(o2.value,999)))
        ELSE
          MAX(GREATEST(q.value, IFNULL(o1.value,0), IFNULL(o2.value,0)))
        END AS value,
        q.valueType,
        q.value AS defaultValue
      FROM quota q
      LEFT JOIN override o1
        ON o1.quota_id = q.id
        AND (o1.project_uuid IS NULL OR o1.project_uuid = @project_uuid)
        AND (o1.object_uuid IS NULL OR o1.object_uuid = @object_uuid)
        AND o1.package_id IS NULL
        AND o1.status = ${SqlModelStatus.ACTIVE}
      LEFT JOIN override o2
        JOIN subscriptionPackage sp
          ON sp.id = o2.package_id
          AND sp.status = ${SqlModelStatus.ACTIVE}
        JOIN subscription s
          ON s.package_id = sp.id
          AND s.project_uuid = @project_uuid
          AND (s.expiresOn IS NULL OR s.expiresOn > NOW())
          AND s.status = ${SqlModelStatus.ACTIVE}
        ON o2.quota_id = q.id
        AND o2.status = ${SqlModelStatus.ACTIVE}
      WHERE q.status = ${SqlModelStatus.ACTIVE}
      AND q.id = @quota_id
      GROUP BY q.id
      
    `,
      {
        quota_id: data.quota_id,
        project_uuid: data.project_uuid || null,
        object_uuid: data.object_uuid || null,
      },
    );

    if (!res.length) {
      throw new ScsCodeException({
        status: 404,
        code: ConfigErrorCode.QUOTA_NOT_FOUND,
      });
    }

    return res[0];
  }
}
