import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.SIMPLET}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`status\` INT NULL,

      \`simplet_uuid\` VARCHAR(36) NOT NULL,
      \`name\` VARCHAR (255) NOT NULL,
      \`description\` VARCHAR(1000) NULL,
      \`contract_uuid\` VARCHAR(36) NULL,
      \`backendRepo\` VARCHAR(255) NULL,
      \`backendPath\` VARCHAR(255) NULL,
      \`backendMachine\` JSON NULL,
      \`frontendRepo\` VARCHAR(255) NULL,
      \`frontendPath\` VARCHAR(255) NULL,
      \`frontendInstallCommand\` VARCHAR(255) NULL,
      \`frontendBuildCommand\` VARCHAR(255) NULL,

      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,

      PRIMARY KEY (\`id\`),
      CONSTRAINT unique_simplet_uuid UNIQUE (\`simplet_uuid\`)
    );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.SIMPLET}\`;
  `);
}
