import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
    ADD COLUMN \`isAutoIncrement\` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN \`contractVersion_id\` INT NULL,
    ADD CONSTRAINT \`fk_collection_contract_version\`
        FOREIGN KEY (\`contractVersion_id\`)
        REFERENCES \`contract_version\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
    DROP COLUMN \`isAutoIncrement\`,
    DROP FOREIGN KEY \`fk_collection_contract_version\`,
    DROP COLUMN \`contractVersion\`;
  `);
}
