import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE \`${DbTables.EMBEDDED_WALLET_INTEGRATION}\` ADD COLUMN \`whitelistedDomains\` TEXT AFTER \`description\`;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE \`${DbTables.EMBEDDED_WALLET_INTEGRATION}\` DROP COLUMN \`whitelistedDomains\`;`,
  );
}
