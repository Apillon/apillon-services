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
  }', 'Deploy website content to production environment'),
  (${Products.CHANGE_WEBSITE_DOMAIN}, '${
    Products[Products.CHANGE_WEBSITE_DOMAIN]
  }', 'Change website domain'),
  (${Products.NFT_COLLECTION}, '${
    Products[Products.NFT_COLLECTION]
  }', 'Create new NFT collection'),
  (${Products.MINT_NFT}, '${Products[Products.MINT_NFT]}', 'Mint NFT'),
  (${Products.BURN_NFT}, '${Products[Products.BURN_NFT]}', 'Burn NFT'),
  (${Products.TRANSFER_COLLECTION}, '${
    Products[Products.TRANSFER_COLLECTION]
  }', 'Transfer collection'),
  (${Products.KILT_IDENTITY}, '${
    Products[Products.KILT_IDENTITY]
  }', 'Kilt identity - DID + credentials'),
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
