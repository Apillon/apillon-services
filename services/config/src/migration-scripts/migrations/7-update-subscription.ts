import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.SUBSCRIPTION}\`
    ADD COLUMN \`subscriberEmail\` VARCHAR(255) NOT NULL,
    ADD COLUMN \`stripeId\` VARCHAR(60) NOT NULL,
    ADD COLUMN \`cancelDate\` DATETIME NULL,
    ADD COLUMN \`cancellationReason\` VARCHAR(1000) NULL,
    ADD COLUMN \`cancellationComment\` VARCHAR(1000) NULL;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.SUBSCRIPTION}\`
    DROP COLUMN \`subscriberEmail\`,
    DROP COLUMN \`stripeId\`,
    DROP COLUMN \`cancelDate\`,
    DROP COLUMN \`cancellationReason\`,
    DROP COLUMN \`cancellationComment\`;
  `);
}
