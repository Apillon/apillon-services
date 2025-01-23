import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION}\`
      ADD COLUMN \`callMethod\` VARCHAR(255) NULL AFTER transactionType,
      ADD COLUMN \`callArguments\` JSON NULL AFTER callMethod;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION}\`
    DROP
    COLUMN callMethod,
        DROP
    COLUMN callArguments;
  `);
}
