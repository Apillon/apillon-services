export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
  ALTER TABLE \`authToken\` 
  CHANGE COLUMN \`createTime\` \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
  `);
}

export async function downgrade(
  _queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  //
}
