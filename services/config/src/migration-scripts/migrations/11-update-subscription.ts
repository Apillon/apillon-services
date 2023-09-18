import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.SUBSCRIPTION}\`
    ADD COLUMN \`paymentFailures\` INT NULL,
    ADD COLUMN \`isCanceled\` TINYINT NULL DEFAULT false,
    ADD COLUMN \`cancelDate\` DATETIME NULL,
    ADD COLUMN \`subscriberEmail\` VARCHAR(255) NOT NULL
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.SUBSCRIPTION}\`
    DROP COLUMN \`paymentFailures\`,
    DROP COLUMN \`isCanceled\`,
    DROP COLUMN \`cancelDate\`,
    DROP COLUMN \`subscriberEmail\`,
  `);
}
