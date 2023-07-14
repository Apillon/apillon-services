import { QuotaCode } from '@apillon/lib';
import { Stage } from '../interfaces/stage.interface';

/**
 * General function for overriding default quota
 * @param stage
 * @param projectUuid
 * @param quotaCode
 * @param quotaValue
 */
export async function overrideDefaultQuota(
  stage: Stage,
  projectUuid: string,
  quotaCode: QuotaCode,
  quotaValue: number,
) {
  await stage.configContext.mysql.paramExecute(`
    INSERT INTO override (status, quota_id, project_uuid, object_uuid, package_id, value)
    VALUES (5,
            ${quotaCode},
            '${projectUuid}',
            null,
            null,
            ${quotaValue})
  `);
}
