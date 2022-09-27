import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT IGNORE INTO \`${DbTables.SERVICE_TYPE}\`
      (id, name, description, active)
    VALUES
      (1, 'Authentication', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum.', 1),
      (2, 'Storage', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum.', 0),
      (3, 'Computing', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum.', 0)
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
