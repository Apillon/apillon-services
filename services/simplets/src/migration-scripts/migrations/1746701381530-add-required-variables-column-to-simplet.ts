import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.SIMPLET}
      ADD COLUMN \`frontendRequiredVariables\` TEXT NULL AFTER \`frontendBuildDirectory\`,
      ADD COLUMN \`backendRequiredVariables\`  TEXT NULL AFTER \`backendMachine\`;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.SIMPLET}
      DROP COLUMN \`frontendRequiredVariables\`,
      DROP COLUMN \`backendRequiredVariables\`;`,
  );
}
