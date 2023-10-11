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

  (${ProductCode.NFT_MOONBEAM_COLLECTION}, '${
    ProductCode[ProductCode.NFT_MOONBEAM_COLLECTION]
  }', 'Create new Moonbeam NFT collection', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_MOONBASE_COLLECTION}, '${
    ProductCode[ProductCode.NFT_MOONBASE_COLLECTION]
  }', 'Create new Moonbase NFT collection', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_ASTAR_COLLECTION}, '${
    ProductCode[ProductCode.NFT_ASTAR_COLLECTION]
  }', 'Create new Astar NFT collection', ${SqlModelStatus.ACTIVE}),

  (${ProductCode.NFT_MOONBEAM_MINT}, '${
    ProductCode[ProductCode.NFT_MOONBEAM_MINT]
  }', 'Mint Moonbeam NFT', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_MOONBASE_MINT}, '${
    ProductCode[ProductCode.NFT_MOONBASE_MINT]
  }', 'Mint Moonbase NFT', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_ASTAR_MINT}, '${
    ProductCode[ProductCode.NFT_ASTAR_MINT]
  }', 'Mint Astar NFT', ${SqlModelStatus.ACTIVE}),

  (${ProductCode.NFT_MOONBEAM_BURN}, '${
    ProductCode[ProductCode.NFT_MOONBEAM_BURN]
  }', 'Burn Moonbeam NFT', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_MOONBASE_BURN}, '${
    ProductCode[ProductCode.NFT_MOONBASE_BURN]
  }', 'Burn Moonbase NFT', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_ASTAR_BURN}, '${
    ProductCode[ProductCode.NFT_ASTAR_BURN]
  }', 'Burn Astar NFT', ${SqlModelStatus.ACTIVE}),

  (${ProductCode.NFT_MOONBEAM_TRANSFER_COLLECTION}, '${
    ProductCode[ProductCode.NFT_MOONBEAM_TRANSFER_COLLECTION]
  }', 'Transfer Moonbeam NFT collection', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_MOONBASE_TRANSFER_COLLECTION}, '${
    ProductCode[ProductCode.NFT_MOONBASE_TRANSFER_COLLECTION]
  }', 'Transfer Moonbase NFT collection', ${SqlModelStatus.ACTIVE}),
  (${ProductCode.NFT_ASTAR_TRANSFER_COLLECTION}, '${
    ProductCode[ProductCode.NFT_ASTAR_TRANSFER_COLLECTION]
  }', 'Transfer Astar NFT collection', ${SqlModelStatus.ACTIVE}),

  (${ProductCode.KILT_IDENTITY}, '${
    ProductCode[ProductCode.KILT_IDENTITY]
  }', 'Kilt identity - DID + credentials', ${SqlModelStatus.ACTIVE})
;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT};
  `);
}
