import { DefaultApiKeyRole, DefaultUserRole } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO role (id, status, name, type)
    VALUES 
    (${DefaultUserRole.ADMIN}, 5, 'Admin', 1),
    (${DefaultUserRole.SUPPORT}, 5, 'Support', 1),
    (${DefaultUserRole.ANALYTIC}, 5, 'Analytic', 1),
    (${DefaultUserRole.PROJECT_OWNER}, 5, 'Project Owner', 1),
    (${DefaultUserRole.PROJECT_ADMIN}, 5, 'Project Admin', 1),
    (${DefaultUserRole.PROJECT_USER}, 5, 'Project User', 1),
    (${DefaultUserRole.USER}, 5, 'User', 1),

    (${DefaultApiKeyRole.KEY_EXECUTE}, 5, 'Api Key Execute', 2),
    (${DefaultApiKeyRole.KEY_WRITE}, 5, 'Api Key Write', 2),
    (${DefaultApiKeyRole.KEY_READ}, 5, 'Api Key Read', 2)
;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM role
    WHERE id IN (
      ${DefaultUserRole.ADMIN},
      ${DefaultUserRole.SUPPORT},
      ${DefaultUserRole.ANALYTIC},
      ${DefaultUserRole.PROJECT_OWNER},
      ${DefaultUserRole.PROJECT_ADMIN},
      ${DefaultUserRole.PROJECT_USER},
      ${DefaultUserRole.USER},
      
      ${DefaultApiKeyRole.KEY_EXECUTE},
      ${DefaultApiKeyRole.KEY_WRITE},
      ${DefaultApiKeyRole.KEY_READ}
    );
  `);
}
