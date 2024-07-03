import { DbTables } from '../../config/types';
import {
  ProductCategory,
  ProductCode,
  ProductService,
  SqlModelStatus,
} from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status, service,
                                     category)
    VALUES (${ProductCode.CONTRACT_ETHEREUM_CREATE}, '${
      ProductCode[ProductCode.CONTRACT_ETHEREUM_CREATE]
    }', 'Create new Ethereum contract', ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.ETHEREUM_CONTRACT}
            '),

           (${ProductCode.CONTRACT_SEPOLIA_CREATE}, '${
             ProductCode[ProductCode.CONTRACT_SEPOLIA_CREATE]
           }', 'Create new Sepolia contract', ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.SEPOLIA_CONTRACT}
            '),

           (${ProductCode.CONTRACT_MOONBASE_CREATE}, '${
             ProductCode[ProductCode.CONTRACT_MOONBASE_CREATE]
           }', 'Create new Moonbase contract', ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.MOONBASE_CONTRACT}
            '),

           (${ProductCode.CONTRACT_MOONBEAM_CREATE}, '${
             ProductCode[ProductCode.CONTRACT_MOONBEAM_CREATE]
           }', 'Create new Moonbeam contract', ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.MOONBEAM_CONTRACT}
            '),

           (${ProductCode.CONTRACT_ASTAR_CREATE}, '${
             ProductCode[ProductCode.CONTRACT_ASTAR_CREATE]
           }', 'Create new Astar contract',
            ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.ASTAR_CONTRACT}'),

           (${ProductCode.CONTRACT_ETHEREUM_CALL}, '${
             ProductCode[ProductCode.CONTRACT_ETHEREUM_CALL]
           }', 'Call Ethereum contract', ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.ETHEREUM_CONTRACT}
            '),

           (${ProductCode.CONTRACT_SEPOLIA_CALL}, '${
             ProductCode[ProductCode.CONTRACT_SEPOLIA_CALL]
           }', 'Call Sepolia contract', ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.SEPOLIA_CONTRACT}
            '),

           (${ProductCode.CONTRACT_MOONBASE_CALL}, '${
             ProductCode[ProductCode.CONTRACT_MOONBASE_CALL]
           }', 'Call Moonbase contract', ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.MOONBASE_CONTRACT}
            '),

           (${ProductCode.CONTRACT_MOONBEAM_CALL}, '${
             ProductCode[ProductCode.CONTRACT_MOONBEAM_CALL]
           }', 'Call Moonbeam contract', ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.MOONBEAM_CONTRACT}
            '),

           (${ProductCode.CONTRACT_ASTAR_CALL}, '${
             ProductCode[ProductCode.CONTRACT_ASTAR_CALL]
           }', 'Call Astar contract',
            ${SqlModelStatus.ACTIVE},
            '${ProductService.CONTRACTS}', '${ProductCategory.ASTAR_CONTRACT}')
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.CONTRACT_ETHEREUM_CREATE}, 500,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_SEPOLIA_CREATE}, 2,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_MOONBASE_CREATE}, 2,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_MOONBEAM_CREATE}, 2,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_ASTAR_CREATE}, 2,
            ${SqlModelStatus.ACTIVE}),

           (${ProductCode.CONTRACT_ETHEREUM_CALL}, 500,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_SEPOLIA_CALL}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_MOONBASE_CALL}, 2, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_MOONBEAM_CALL}, 2,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_ASTAR_CALL}, 2,
            ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const ids = [
    // create
    ProductCode.CONTRACT_ETHEREUM_CREATE,
    ProductCode.CONTRACT_SEPOLIA_CREATE,
    ProductCode.CONTRACT_MOONBASE_CREATE,
    ProductCode.CONTRACT_MOONBEAM_CREATE,
    ProductCode.CONTRACT_ASTAR_CREATE,
    // call
    ProductCode.CONTRACT_ETHEREUM_CALL,
    ProductCode.CONTRACT_SEPOLIA_CALL,
    ProductCode.CONTRACT_MOONBASE_CALL,
    ProductCode.CONTRACT_MOONBEAM_CALL,
    ProductCode.CONTRACT_ASTAR_CALL,
  ];
  await queryFn(`
    DELETE
    FROM ${DbTables.PRODUCT_PRICE}
    WHERE product_id IN (${ids.join(',')});
  `);
  await queryFn(`
    DELETE
    FROM ${DbTables.PRODUCT}
    WHERE id IN (${ids.join(',')});
  `);
}
