import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    MODIFY \`value\` DECIMAL(12,4);
  `);

  await queryFn(`
    ALTER TABLE  \`${DbTables.WALLET_DEPOSIT}\`
    ADD UNIQUE INDEX \`idx_hash\` (\`transactionHash\` ASC);
`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    MODIFY \`value\` DECIMAL(12,2);
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET_DEPOSIT}\`
    DROP INDEX \`idx_hash\`;
  `);
}
