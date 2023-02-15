import { SqlModelStatus } from '@apillon/lib';
import { DbTables, DbViews } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE OR REPLACE VIEW \`${DbViews.DOMAINS}\` AS
        SELECT wp.domain
        FROM \`${DbTables.WEBSITE}\` wp
        JOIN \`${DbTables.BUCKET}\` b ON b.id = wp.productionBucket_id
        WHERE wp.domain IS NOT NULL
        AND b.CID IS NOT NULL
        AND wp.status <> ${SqlModelStatus.DELETED};
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP VIEW IF EXISTS \`${DbViews.DOMAINS}\`;
  `);
}
