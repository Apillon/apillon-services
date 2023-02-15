import { DefaultUserRole } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO role (id, status, name, type)
    VALUES 
     (${DefaultUserRole.INTERNAL_TEST_USER}, 5, 'Internal test User', 1),
     (${DefaultUserRole.EXTERNAL_TEST_USER}, 5, 'External test User', 1),
     (${DefaultUserRole.BETA_USER}, 5, 'Beta User', 1)
    ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM role
    WHERE id IN (
      ${DefaultUserRole.INTERNAL_TEST_USER}, 
      ${DefaultUserRole.EXTERNAL_TEST_USER}, 
      ${DefaultUserRole.BETA_USER}
    );
  `);
}
