import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE VIEW \`${DbTables.BALANCE}\` AS
      SELECT \`player_id\`, IFNULL(SUM(\`value\`), 0) as \`balance\`, IFNULL(SUM(\`deposit\`), 0) AS \`all_time\` FROM (
        SELECT
          CASE
            WHEN \`direction\` = 1 THEN \`amount\`
            WHEN \`direction\` = 2 THEN - \`amount\`
            ELSE 0
          END AS \`value\`, 
          IF(\`direction\` = 1, \`amount\`, 0) AS \`deposit\`, 
          \`player_id\` 
        FROM \`${DbTables.TRANSACTION}\`
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
