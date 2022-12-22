import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.REALIZATION}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`task_id\` INT NOT NULL,
      \`player_id\` INT NOT NULL,
      \`transaction_id\` INT NOT NULL,
      \`reward\` INT NOT NULL,
      \`data\` JSON NULL,
      \`status\` INT NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_realization_task\`
        FOREIGN KEY (\`task_id\`)
        REFERENCES \`${DbTables.TASK}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
      CONSTRAINT \`fk_realization_player\`
        FOREIGN KEY (\`player_id\`)
        REFERENCES \`${DbTables.PLAYER}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
      CONSTRAINT \`fk_realization_transaction\`
        FOREIGN KEY (\`transaction_id\`)
        REFERENCES \`${DbTables.TRANSACTION}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.REALIZATION}\`;
  `);
}
