import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.TASK} (id, type, name, description, reward, maxCompleted, status)
    VALUES 
    (1, 1, 'Referral', 'Referral', 2, NULL, 5),
    (2, 2, 'Twitter connect', 'Twitter connect', 2, 1, 5),
    (3, 3, 'Gihub connect', 'Gihub connect', 2, 1, 5),
    (4, 4, 'Twitter retweet', 'Twitter retweet', 1, NULL, 5);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.TASK}
    WHERE id IN (1,2,3,4);
  `);
}
