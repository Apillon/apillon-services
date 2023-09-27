import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.SUBSCRIPTION_PACKAGE}\`
    ADD COLUMN \`stripeId\` VARCHAR(60) NOT NULL,
    ADD COLUMN \`deactivationDate\` DATETIME NULL
    ADD COLUMN \`creditAmount\` INT NULL;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.SUBSCRIPTION}\`
    DROP COLUMN \`stripeId\`,
    DROP COLUMN \`deactivationDate\`
    DROP COLUMN \`creditAmount\`;
  `);
}
