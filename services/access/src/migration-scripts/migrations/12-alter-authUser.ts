export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`authUser\` 
    CHANGE COLUMN \`wallet\` \`wallet\` VARCHAR(100) NULL DEFAULT NULL ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`authUser\` 
    CHANGE COLUMN \`wallet\` \`wallet\` VARCHAR(42) NULL DEFAULT NULL ;
  `);
}
