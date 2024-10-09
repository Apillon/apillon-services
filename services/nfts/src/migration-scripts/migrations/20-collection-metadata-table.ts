import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS ${DbTables.COLLECTION_METADATA} (
      id INT NOT NULL AUTO_INCREMENT,
      collection_id INT NOT NULL,
      tokenId INT NOT NULL,
      metadata JSON NOT NULL,
      minted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      FOREIGN KEY (collection_id) REFERENCES ${DbTables.COLLECTION} (id) ON DELETE CASCADE ON UPDATE NO ACTION
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
