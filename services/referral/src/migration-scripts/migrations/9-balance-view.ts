import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE VIEW \`${DbTables.BALANCE}\` AS
      SELECT \`player_id\`, SUM(\`value\`) as \`balance\` FROM (
        SELECT
        CASE
          WHEN \`direction\` = 1 THEN \`amount\`
          WHEN \`direction\` = 2 THEN - \`amount\`
          ELSE 0
        END AS \`value\`, \`player_id\` FROM \`${DbTables.TRANSACTION}\`
        WHERE status <= 5
      ) t
      GROUP BY \`player_id\`
      ORDER BY \`player_id\`;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP VIEW IF EXISTS \`${DbTables.BALANCE}\`;
  `);
}
