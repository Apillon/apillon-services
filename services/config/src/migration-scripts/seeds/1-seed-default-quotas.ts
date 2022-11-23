export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO quota (id, status, group, name, description, limitType, limit)
    VALUES 
    (1, 5, 'Project', 'Project count limit', 'Number of max project owned by user', 1, 10),
    (2, 5, 'Storage', 'Bucket size limit in GB', 'Max size of files in bucket', 1, 5)
;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM quota
    WHERE id IN (1,2);
  `);
}
