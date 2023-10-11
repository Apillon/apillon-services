import { DbTables, IdentityConfigKey } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.IDENTITY_CONFIG} (key, value)
    VALUES ('${IdentityConfigKey.ATTESTER_DID_TX_COUNTER}', '25');
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.IDENTITY_CONFIG};
  `);
}
