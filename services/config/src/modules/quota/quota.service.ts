import { GetQuotaDto } from '@apillon/lib';
import { ServiceContext } from '../../context';

export class QuotaService {
  static async getQuota(data: GetQuotaDto, context: ServiceContext) {
    console.log(data, context);

    return await context.mysql.paramExecute(`
      SELECT q.id,
        MAX(q.limit) AS maxLimit,
        MIN(q.limit) AS minLimit,
        q.limitType,
        q.status
      FROM quota q
      LEFT JOIN override o1
        ON o1.quota_id = q.id
        AND o1.project_uuid = @project_uuid
        AND (o1.object_uuid IS NULL OR o1.object_uuid = @object_uuid)
        AND o1.status = 5
      LEFT JOIN override o2
        JOIN subscriptionPackage sp
          ON sp.id = o2.package_id
          AND sp.status = 5
        JOIN subscription s
          ON s.package_id = sp.id
          AND s.project_uuid = @project_uuid
          AND s.expiresOn IS NULL OR s.expiresOn > NOW()
          AND s.status = 5
        ON o2.quota_id = q.id
        AND o2.status = 5
      WHERE q.status = 5
      AND q.id = @quote_id
      GROUP BY q.id
    `);
  }
}
