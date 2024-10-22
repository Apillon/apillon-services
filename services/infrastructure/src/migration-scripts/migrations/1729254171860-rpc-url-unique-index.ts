import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.RPC_URL}\`
    DROP INDEX \`network\`,
    ADD UNIQUE INDEX \`unique_network_apiKeyId_chainName\` (\`network\`, \`apiKeyId\`, \`chainName\`);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.RPC_URL}\`
    DROP INDEX \`unique_network_apiKeyId_chainName\`,
    ADD UNIQUE INDEX \`network\` (\`network\`, \`apiKeyId\`);
  `);
}
