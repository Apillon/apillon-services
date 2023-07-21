import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    ADD COLUMN \`description\` VARCHAR(300) NULL AFTER \`value\`;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    MODIFY \`amount\` VARCHAR(36) NOT NULL DEFAULT '0'
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    MODIFY \`fee\` VARCHAR(36) NOT NULL DEFAULT '0'
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    MODIFY \`totalPrice\` VARCHAR(36) NOT NULL DEFAULT '0'
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    DROP COLUMN \`description\`;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    MODIFY \`amount\` DECIMAL(40,0) NOT NULL DEFAULT 0
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    MODIFY \`fee\` DECIMAL(40,0) NOT NULL DEFAULT 0
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_LOG}\`
    MODIFY \`totalPrice\` DECIMAL(40,0) NOT NULL DEFAULT 0
  `);
}
