import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // TODO: Add execution Wallet and chain id
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.COLLECTION_METADATA}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`collection_id\` INT NOT NULL,
  \`metadataSessionUuid\` VARCHAR(36) NOT NULL,
  \`imagesSessionUuid\` VARCHAR(36) NOT NULL,
  \`cid\` VARCHAR(255) NULL,
  \`metadataStatus\` INT NULL,
  \`errorMessage\` TEXT NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_collectionMetadata_collection\`
        FOREIGN KEY (\`collection_id\`)
        REFERENCES \`${DbTables.COLLECTION}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.COLLECTION_METADATA}\`;
  `);
}
