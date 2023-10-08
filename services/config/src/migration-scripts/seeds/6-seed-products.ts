import { DbTables } from '../../config/types';
import { ProductCode, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status)
    VALUES 
    (${ProductCode.HOSTING_WEBSITE}, '${
    ProductCode[ProductCode.HOSTING_WEBSITE]
  }', 'Creation of new website', ${SqlModelStatus.ACTIVE}),
    (${ProductCode.HOSTING_DEPLOY_TO_STAGING}, '${
    ProductCode[ProductCode.HOSTING_DEPLOY_TO_STAGING]
  }', 'Deploy website content to staging environment', ${
    SqlModelStatus.ACTIVE
  }),
    (${ProductCode.HOSTING_DEPLOY_TO_PRODUCTION}, '${
    ProductCode[ProductCode.HOSTING_DEPLOY_TO_PRODUCTION]
  }', 'Deploy website content to production environment', ${
    SqlModelStatus.ACTIVE
  }),
  (${ProductCode.HOSTING_CHANGE_WEBSITE_DOMAIN}, '${
    ProductCode[ProductCode.HOSTING_CHANGE_WEBSITE_DOMAIN]
  }', 'Change website domain', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_COLLECTION}, '${
    ProductCode[ProductCode.NFT_COLLECTION]
  }', 'Create new NFT collection', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_MINT}, '${
    ProductCode[ProductCode.NFT_MINT]
  }', 'Mint NFT', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_BURN}, '${
    ProductCode[ProductCode.NFT_BURN]
  }', 'Burn NFT', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_TRANSFER_COLLECTION}, '${
    ProductCode[ProductCode.NFT_TRANSFER_COLLECTION]
  }', 'Transfer collection', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.KILT_IDENTITY}, '${
    ProductCode[ProductCode.KILT_IDENTITY]
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
