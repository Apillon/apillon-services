export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO quota (id, status, groupName, name, description, valueType, value)
    VALUES 
    (1, 5, 'Project', 'Project count limit', 'Number of max project owned by user', 1, 10),
    (2, 5, 'Project', 'Users on project', 'Number of max users on single project', 1, 10),
    (3, 5, 'Api Key', 'Number of API keys', 'Max number of API keys on project', 1, 10),
    (4, 5, 'Storage', 'Number of hosting buckets', 'Max number of buckets for web hosting', 1, 5),
    (5, 5, 'Storage', 'Number of file buckets', 'Max number of buckets for web hosting', 1, 5),
    (6, 5, 'Storage', 'Bucket size limit in GB', 'Max size of files in bucket', 1, 5),
    (7, 5, 'Authorization', 'Number of attested users', 'Max count of attested users', 1, 10000)
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
