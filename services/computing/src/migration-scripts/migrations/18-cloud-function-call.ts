import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.CLOUD_FUNCTION_CALL}\`
    (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`function_uuid\` VARCHAR(36) NOT NULL,
      \`success\` TINYINT NOT NULL,
      \`error\` VARCHAR(200) NULL,
      \`timestamp\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(\`id\`)
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.CLOUD_FUNCTION_CALL}\`;
  `);
}
