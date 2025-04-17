import { AttachedServiceType } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT
    IGNORE
    INTO \`${DbTables.SERVICE_TYPE}\`
      (id, name, description, active)
    VALUES (
    ${AttachedServiceType.SIMPLETS},
    'Simplets',
    'Simplets service',
    1
    )
    ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    IGNORE
    FROM \`${DbTables.SERVICE_TYPE}\`
    WHERE id =
    ${AttachedServiceType.SIMPLETS};
  `);
}
