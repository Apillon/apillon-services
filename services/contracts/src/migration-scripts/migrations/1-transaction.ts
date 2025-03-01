import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.TRANSACTION}\`
    (
      \`id\`                INT          NOT NULL AUTO_INCREMENT,
      \`transaction_uuid\`  VARCHAR(36)  NULL,
      \`chain\`             INT          NOT NULL,
      \`transactionType\`   INT          NOT NULL,
      \`callMethod\`    VARCHAR(255) NULL,
      \`callArguments\` JSON         NULL,
      \`refTable\`          VARCHAR(100) NULL,
      \`refId\`         VARCHAR(36)  NULL,
      \`transactionStatus\` INT          NULL,
      \`transactionHash\`   VARCHAR(255) NULL,
      \`errorMessage\`      TEXT         NULL,
      \`status\`            INT          NULL,
      \`createTime\`        DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\`        INT          NULL,
      \`updateTime\`        DATETIME     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\`        INT          NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT unique_transaction_uuid UNIQUE (transaction_uuid)
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.TRANSACTION}\`;
  `);
}
