import { DbTables } from '../../config/types';
import { ProductCode, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, status)
    VALUES (${ProductCode.CONTRACT_BASE_CREATE}, '${
      ProductCode[ProductCode.CONTRACT_BASE_CREATE]
    }', 'Creation of new contract', ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_BASE_SEPOLIA_CREATE}, '${
             ProductCode[ProductCode.CONTRACT_BASE_SEPOLIA_CREATE]
           }', 'Creation of new contract', ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_BASE_SEPOLIA_CALL}, '${
             ProductCode[ProductCode.CONTRACT_BASE_SEPOLIA_CALL]
           }', 'Call contract', ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_BASE_CALL}, '${
             ProductCode[ProductCode.CONTRACT_BASE_CALL]
           }', 'Call contract', ${SqlModelStatus.ACTIVE})
    ;`);

  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
    VALUES (${ProductCode.CONTRACT_BASE_CREATE}, 100, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_BASE_CALL}, 10, ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_BASE_SEPOLIA_CREATE}, 1,
            ${SqlModelStatus.ACTIVE}),
           (${ProductCode.CONTRACT_BASE_SEPOLIA_CALL}, 1,
            ${SqlModelStatus.ACTIVE})
    ;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM ${DbTables.PRODUCT}
    WHERE id IN (
                 ${ProductCode.CONTRACT_BASE_CREATE},
                 ${ProductCode.CONTRACT_BASE_CALL},
                 ${ProductCode.CONTRACT_BASE_SEPOLIA_CREATE},
                 ${ProductCode.CONTRACT_BASE_SEPOLIA_CALL}
      );
  `);
}
