import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.RPC_URL}\`
    MODIFY \`httpsUrl\` VARCHAR(500) NULL,
    MODIFY \`wssUrl\` VARCHAR(500) NULL;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    UPDATE \`${DbTables.RPC_URL}\`
    SET \`httpsUrl\` = ''
    WHERE \`httpsUrl\` IS NULL;
  `);

  await queryFn(`
    UPDATE \`${DbTables.RPC_URL}\`
    SET \`wssUrl\` = ''
    WHERE \`wssUrl\` IS NULL;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.RPC_URL}\`
    MODIFY \`httpsUrl\` VARCHAR(500) NOT NULL,
    MODIFY \`wssUrl\` VARCHAR(500) NOT NULL;
  `);
}
