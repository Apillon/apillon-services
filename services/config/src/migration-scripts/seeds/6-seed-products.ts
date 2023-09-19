import { DbTables } from '../../config/types';
import { Products } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description)
    VALUES 
    (${Products.WEBSITE}, '${
    Products[Products.WEBSITE]
  }', 'Creation of new website'),
    (${Products.DEPLOY_TO_STAGING}, '${
    Products[Products.DEPLOY_TO_STAGING]
  }', 'Deploy website content to staging environment'),
    (${Products.DEPLOY_TO_PRODUCTION}, '${
    Products[Products.DEPLOY_TO_PRODUCTION]
  }', 'Deploy website content to production environment')
;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT};
  `);
}
