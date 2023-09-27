import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.SUBSCRIPTION}\`
    ADD COLUMN \`paymentFailures\` INT NOT NULL DEFAULT 0,
    ADD COLUMN \`isCanceled\` TINYINT NOT NULL DEFAULT 0,
    ADD COLUMN \`cancelDate\` DATETIME NULL,
    ADD COLUMN \`subscriberEmail\` VARCHAR(255) NOT NULL,
    ADD COLUMN \`stripeId\` VARCHAR(60) NOT NULL,
    ADD COLUMN \`creditAmount\` INT NOT NULL;
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
    DROP COLUMN \`creditAmount\`;
  `);
}
