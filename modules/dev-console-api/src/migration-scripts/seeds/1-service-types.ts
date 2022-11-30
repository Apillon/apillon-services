import { AttachedServiceType } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT IGNORE INTO \`${DbTables.SERVICE_TYPE}\`
      (id, name, description, active)
    VALUES
      (${AttachedServiceType.AUTHORIZATION}, 'Authorization', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum.', 1),
      (${AttachedServiceType.STORAGE}, 'Storage', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum.', 0)
      ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE IGNORE FROM \`${DbTables.SERVICE_TYPE}\`
    WHERE id IN (1,2,3);
  `);
}
