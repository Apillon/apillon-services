import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.OASIS_SIGNATURE}\`
    ADD COLUMN \`embeddedWalletIntegration_id\` INT NULL AFTER \`status\`,
    ADD CONSTRAINT \`fk_signature_ew_integration\`
        FOREIGN KEY (\`embeddedWalletIntegration_id\`)
        REFERENCES \`${DbTables.EMBEDDED_WALLET_INTEGRATION}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.OASIS_SIGNATURE}\`
    DROP CONSTRAINT \`fk_signature_ew_integration\`
    ;
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.OASIS_SIGNATURE}\`
    DROP COLUMN \`embeddedWalletIntegration_id\`
    ;
  `);
}
