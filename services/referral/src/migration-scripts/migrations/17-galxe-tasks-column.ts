import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.USER_AIRDROP_TASK}\`
    ADD COLUMN \`galxeTasksCompleted\` INT NOT NULL DEFAULT 0;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.USER_AIRDROP_TASK}\`
    DROP COLUMN \`galxeTasksCompleted\`;
  `);
}
