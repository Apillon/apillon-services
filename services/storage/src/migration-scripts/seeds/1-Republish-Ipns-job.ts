export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO \`job\` (\`status\`, \`name\`, \`interval\`, \`nextRun\`, \`timeout\`) 
    VALUES ('5', 'RepublishIpnsWorker', '*/5 * * * *', NOW(), '900'); `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM job WHERE name = 'RepublishIpnsWorker';
  `);
}
