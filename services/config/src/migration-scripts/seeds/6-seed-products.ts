import { DbTables } from '../../config/types';
import { Products, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status)
    VALUES 
    (${Products.WEBSITE}, '${
    Products[Products.WEBSITE]
  }', 'Creation of new website', ${SqlModelStatus.ACTIVE}),
    (${Products.DEPLOY_TO_STAGING}, '${
    Products[Products.DEPLOY_TO_STAGING]
  }', 'Deploy website content to staging environment', ${
    SqlModelStatus.ACTIVE
  }),
    (${Products.DEPLOY_TO_PRODUCTION}, '${
    Products[Products.DEPLOY_TO_PRODUCTION]
  }', 'Deploy website content to production environment', ${
    SqlModelStatus.ACTIVE
  }),
  (${Products.CHANGE_WEBSITE_DOMAIN}, '${
    Products[Products.CHANGE_WEBSITE_DOMAIN]
  }', 'Change website domain', ${SqlModelStatus.ACTIVE}),
  (${Products.NFT_COLLECTION}, '${
    Products[Products.NFT_COLLECTION]
  }', 'Create new NFT collection', ${SqlModelStatus.ACTIVE}),
  (${Products.MINT_NFT}, '${Products[Products.MINT_NFT]}', 'Mint NFT', ${
    SqlModelStatus.ACTIVE
  }),
  (${Products.BURN_NFT}, '${Products[Products.BURN_NFT]}', 'Burn NFT', ${
    SqlModelStatus.ACTIVE
  }),
  (${Products.TRANSFER_COLLECTION}, '${
    Products[Products.TRANSFER_COLLECTION]
  }', 'Transfer collection', ${SqlModelStatus.ACTIVE}),
  (${Products.KILT_IDENTITY}, '${
    Products[Products.KILT_IDENTITY]
  }', 'Kilt identity - DID + credentials', ${SqlModelStatus.ACTIVE})
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
