export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO role (id, status, name, type)
    VALUES 
    (1, 5, 'Admin', 1),
    (2, 5, 'Support', 1),
    (3, 5, 'Analytic', 1),
    (10, 5, 'Project Owner', 1),
    (11, 5, 'Project Admin', 1),
    (12, 5, 'Project User', 1),
    (99, 5, 'User', 1),

    (50, 5, 'Api Key Execute', 2),
    (51, 5, 'Api Key Write', 2),
    (52, 5, 'Api Key Read', 2)
;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM role
    WHERE id IN (1,2,3,10,11,12,99,50,51,52);
  `);
}
