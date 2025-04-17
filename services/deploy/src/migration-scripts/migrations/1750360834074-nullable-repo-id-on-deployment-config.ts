import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT_CONFIG}\` MODIFY \`repoId\` INT NULL; 
  `);
}

export async function downgrade(
  _queryFn: (query: string, values?: any[]) => Promise<void>,
) {}
