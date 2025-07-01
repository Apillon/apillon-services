import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.SIMPLET_DEPLOY}
      ADD COLUMN \`backendDockerCompose\` TEXT NULL AFTER \`backendUrl\`,
      ADD COLUMN \`backendVirtualMachine\` TEXT NULL AFTER \`backendDockerCompose\`;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.SIMPLET_DEPLOY}
      DROP COLUMN \`backendDockerCompose\`,
      DROP COLUMN \`backendVirtualMachine\`;`,
  );
}
