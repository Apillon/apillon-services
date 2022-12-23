import { QuotaCode } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO quota (id, status, groupName, name, description, valueType, value)
    VALUES 
    (${QuotaCode.MAX_PROJECT_COUNT}, 5, 'Project', 'Project count limit', 'Number of max project owned by user', 1, 1),
    (${QuotaCode.MAX_USERS_ON_PROJECT}, 5, 'Project', 'Users on project', 'Number of max users on single project', 1, 10),
    (${QuotaCode.MAX_API_KEYS}, 5, 'Api Key', 'Number of API keys', 'Max number of API keys on project', 1, 10),
    (${QuotaCode.MAX_HOSTING_BUCKETS}, 5, 'Storage', 'Number of hosting buckets', 'Max number of buckets for web hosting', 1, 1),
    (${QuotaCode.MAX_FILE_BUCKETS}, 5, 'Storage', 'Number of file buckets', 'Max number of buckets for file hosting', 1, 1),
    (${QuotaCode.MAX_BUCKET_SIZE}, 5, 'Storage', 'Bucket upload size limit in GB', 'Max size of all files uploaded to bucket', 1, 5),
    (${QuotaCode.MAX_ATTESTED_USERS}, 5, 'Authorization', 'Number of attested users', 'Max count of attested users', 1, 10000)
;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM quota
    WHERE id <= 7;
  `);
}
