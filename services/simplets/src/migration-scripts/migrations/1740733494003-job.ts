import { DbTables } from '@apillon/workers-lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.JOB}\`
     (
       \`id\`            INT          NOT NULL AUTO_INCREMENT,
       \`status\`        INT          NULL,
       \`name\`          VARCHAR(45)  NULL,
       \`channel\`       INT          NULL,
       \`interval\`      VARCHAR(45)  NULL,
       \`lastRun\`       DATETIME     NULL,
       \`nextRun\`       DATETIME     NULL,
       \`input\`         VARCHAR(300) NULL,
       \`retries\`       INT          NULL,
       \`timeout\`       INT          NULL,
       \`parameters\`    JSON         NULL,
       \`autoRemove\`    TINYINT      NULL DEFAULT false,
       \`executorCount\` INT          NULL,
       \`lastCompleted\` DATETIME     NULL,
       \`lastDuration\`  INT          NULL,
       \`lastError\`     TEXT         NULL,
       \`lastFailed\`    DATETIME     NULL,
       \`createTime\`    DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
       \`updateTime\`    DATETIME     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       \`createUser\`    INT          NULL,
       \`updateUser\`    INT          NULL,
       PRIMARY KEY (\`id\`)
     )`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.JOB}\`;
  `);
}
