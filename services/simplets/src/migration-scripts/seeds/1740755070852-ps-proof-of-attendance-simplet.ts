import { DbTables } from '../../config/types';
import { SqlModelStatus } from '@apillon/lib';

const SIMPLET_NAME = 'ps-proof-of-attendance';
const SIMPLET_BACKEND_REPOSITORY_URL = `https://raw.githubusercontent.com/Apillon/${SIMPLET_NAME}`;
const SIMPLET_BACKEND_PATH =
  'refs/heads/feature/phala-docker-deploy/backend/docker-compose.yml';
const SIMPLET_FRONTEND_REPOSITORY_URL = `https://github.com/Apillon/${SIMPLET_NAME}`;
const SIMPLET_FRONTEND_PATH = 'frontend';
const SIMPLET_FRONTEND_INSTALL_COMMAND = 'npm install';
const SIMPLET_FRONTEND_BUILD_COMMAND = 'npm run generate';
const SIMPLET_FRONTEND_BUILD_DIRECTORY = 'dist';
const SIMPLET_MACHINE = {
  cpuCount: 1,
  memory: 4096,
  diskSize: 20,
};

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `INSERT INTO \`${DbTables.SIMPLET}\`(\`status\`,
                                         \`simplet_uuid\`,
                                         \`name\`,
                                         \`description\`,
                                         \`contract_uuid\`,
                                         \`backendRepo\`,
                                         \`backendPath\`,
                                         \`backendMachine\`,
                                         \`frontendRepo\`,
                                         \`frontendPath\`,
                                         \`frontendInstallCommand\`,
                                         \`frontendBuildCommand\`,
                                         \`frontendBuildDirectory\`)
     VALUES (${SqlModelStatus.ACTIVE},
             UUID(),
             '${SIMPLET_NAME}',
             NULL,
             NULL,
             '${SIMPLET_BACKEND_REPOSITORY_URL}',
             '${SIMPLET_BACKEND_PATH}',
             '${JSON.stringify(SIMPLET_MACHINE)}',
             '${SIMPLET_FRONTEND_REPOSITORY_URL}',
             '${SIMPLET_FRONTEND_PATH}',
             '${SIMPLET_FRONTEND_INSTALL_COMMAND}',
             '${SIMPLET_FRONTEND_BUILD_COMMAND}',
             '${SIMPLET_FRONTEND_BUILD_DIRECTORY}');`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `DELETE
     FROM \`${DbTables.SIMPLET}\`
     WHERE \`name\` = ${SIMPLET_NAME}`,
  );
}
