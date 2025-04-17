import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT_CONFIG}\` ADD COLUMN \`repoUrl\` VARCHAR(255) NOT NULL DEFAULT '' AFTER \`repoId\`;
  `);

  await queryFn(`
  ALTER TABLE \`${DbTables.DEPLOYMENT_CONFIG}\`
  MODIFY \`projectConfigId\` INT NULL;
`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT_CONFIG}\` DROP COLUMN \`repoUrl\`;
  `);
}
