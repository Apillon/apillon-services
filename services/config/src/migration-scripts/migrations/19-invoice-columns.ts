import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(
    `ALTER TABLE \`${DbTables.INVOICE}\`MODIFY COLUMN clientEmail varchar(60) NULL;`,
  );
  await queryFn(
    `ALTER TABLE \`${DbTables.INVOICE}\`MODIFY COLUMN clientName varchar(60) NULL;`,
  );
  await queryFn(
    `ALTER TABLE \`${DbTables.INVOICE}\`MODIFY COLUMN stripeId varchar(60) NULL;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(
    `ALTER TABLE \`${DbTables.INVOICE}\`MODIFY COLUMN clientEmail varchar(60) NOT NULL;`,
  );
  await queryFn(
    `ALTER TABLE \`${DbTables.INVOICE}\`MODIFY COLUMN clientName varchar(60) NOT NULL;`,
  );
  await queryFn(
    `ALTER TABLE \`${DbTables.INVOICE}\`MODIFY COLUMN stripeId varchar(60) NOT NULL;`,
  );
}
