import { QuotaCode, QuotaType } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(
    `UPDATE quota q SET q.type = ${QuotaType.FOR_OBJECT} WHERE q.id = ${QuotaCode.MAX_PROJECT_COUNT};`,
  );
  await queryFn(
    `UPDATE quota q SET q.type = ${QuotaType.FOR_PROJECT} WHERE q.id IN (
      ${QuotaCode.MAX_USERS_ON_PROJECT},
      ${QuotaCode.MAX_API_KEYS},
      ${QuotaCode.MAX_HOSTING_BUCKETS},
      ${QuotaCode.MAX_FILE_BUCKETS},
      ${QuotaCode.MAX_ATTESTED_USERS},
      ${QuotaCode.MAX_WEBSITES},
      ${QuotaCode.MAX_NFT_COLLECTIONS}
    );`,
  );
  await queryFn(
    `UPDATE quota q SET q.type = ${QuotaType.FOR_PROJECT_AND_OBJECT} WHERE q.id = ${QuotaCode.MAX_BUCKET_SIZE};`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`UPDATE \`${DbTables.QUOTA}\` q SET q.type = NULL;`);
}
