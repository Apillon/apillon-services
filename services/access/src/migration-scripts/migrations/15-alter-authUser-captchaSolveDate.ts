export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`authUser\`
    ADD COLUMN \`captchaSolveDate\` DATETIME NULL ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`authUser\`
    DROP COLUMN \`captchaSolveDate\`;
  `);
}
