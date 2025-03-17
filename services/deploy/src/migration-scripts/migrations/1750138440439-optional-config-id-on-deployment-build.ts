import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT_BUILD}\`
    MODIFY \`deploymentConfigId\` INT NULL;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT_BUILD}\`
    MODIFY \`deploymentConfigId\` INT NOT NULL;
  `);
}
