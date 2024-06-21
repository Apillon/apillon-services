import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.ACURAST_JOB}\`
    (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`job_uuid\` VARCHAR(36) NOT NULL,
      \`project_uuid\` VARCHAR(36) NOT NULL,
      \`status\` INT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`description\` VARCHAR(255) NULL,
      \`scriptCid\` VARCHAR(255) NOT NULL,
      \`slots\` TINYINT NOT NULL,
      \`jobStatus\` INT NOT NULL,
      \`jobId\` INT NULL,
      \`account\` VARCHAR(60) NULL,
      \`publicKey\` VARCHAR(70) NULL,
      \`startTime\` DATETIME NOT NULL,
      \`endTime\` DATETIME NOT NULL,
      \`transactionHash\` VARCHAR(70) NULL,
      \`deployerAddress\` VARCHAR(60) NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY(\`id\`)
      );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.ACURAST_JOB}\`;
  `);
}
