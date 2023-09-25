import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.SUBSCRIPTION_PACKAGE}\`
    ADD COLUMN \`stripeApiId\` VARCHAR(45) NOT NULL,
    ADD COLUMN \`stripeApiIdTest\` VARCHAR(45) NULL,
    ADD COLUMN \`deactivationDate\` DATETIME NULL;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.SUBSCRIPTION}\`
    DROP COLUMN \`stripeApiId\`,
    DROP COLUMN \`deactivationDate\`
    ;
  `);
}
