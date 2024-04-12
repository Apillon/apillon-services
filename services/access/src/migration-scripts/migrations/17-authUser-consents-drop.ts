export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`authUser\`
    DROP COLUMN \`consents\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`authUser\`
    ADD COLUMN \`consents\` JSON NULL DEFAULT NULL ;
  `);
}
