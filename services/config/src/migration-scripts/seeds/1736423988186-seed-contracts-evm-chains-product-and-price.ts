import { DbTables } from '../../config/types';
import {
  ProductCategory,
  ProductCode,
  ProductService,
  SqlModelStatus,
} from '@apillon/lib';

const productInserts = [
  {
    id: ProductCode.CONTRACT_ARBITRUM_ONE_CREATE,
    description: 'Create new contract on Arbitrum One chain',
    category: ProductCategory.ARBITRUM_ONE_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_ARBITRUM_ONE_CALL,
    description: 'Call contract on Arbitrum One chain',
    category: ProductCategory.ARBITRUM_ONE_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_ARBITRUM_ONE_SEPOLIA_CREATE,
    description: 'Create new contract on Arbitrum One Sepolia chain',
    category: ProductCategory.ARBITRUM_ONE_SEPOLIA_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_ARBITRUM_ONE_SEPOLIA_CALL,
    description: 'Call contract on Arbitrum One Sepolia chain',
    category: ProductCategory.ARBITRUM_ONE_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_AVALANCHE_CREATE,
    description: 'Create new contract on Avalanche chain',
    category: ProductCategory.AVALANCHE_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_AVALANCHE_CALL,
    description: 'Call contract on Avalanche chain',
    category: ProductCategory.AVALANCHE_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_AVALANCHE_SEPOLIA_CREATE,
    description: 'Create new contract on Avalanche Sepolia chain',
    category: ProductCategory.AVALANCHE_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_AVALANCHE_SEPOLIA_CALL,
    description: 'Call contract on Avalanche Sepolia chain',
    category: ProductCategory.AVALANCHE_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_OPTIMISM_CREATE,
    description: 'Create new contract on Optimism chain',
    category: ProductCategory.OPTIMISM_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_OPTIMISM_CALL,
    description: 'Call contract on Optimism chain',
    category: ProductCategory.OPTIMISM_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_OPTIMISM_SEPOLIA_CREATE,
    description: 'Create new contract on Optimism Sepolia chain',
    category: ProductCategory.OPTIMISM_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_OPTIMISM_SEPOLIA_CALL,
    description: 'Call contract on Optimism Sepolia chain',
    category: ProductCategory.OPTIMISM_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_POLYGON_CREATE,
    description: 'Create new contract on Polygon chain',
    category: ProductCategory.POLYGON_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_POLYGON_CALL,
    description: 'Call contract on Polygon chain',
    category: ProductCategory.POLYGON_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_POLYGON_AMOY_CREATE,
    description: 'Create new contract on Polygon Amoy chain',
    category: ProductCategory.POLYGON_CONTRACT,
  },
  {
    id: ProductCode.CONTRACT_POLYGON_AMOY_CALL,
    description: 'Call contract on Polygon Amoy chain',
    category: ProductCategory.POLYGON_CONTRACT,
  },
];

const productPriceInserts = [
  {
    product_id: ProductCode.CONTRACT_ARBITRUM_ONE_CREATE,
    price: 100,
  },
  {
    product_id: ProductCode.CONTRACT_ARBITRUM_ONE_CALL,
    price: 10,
  },
  {
    product_id: ProductCode.CONTRACT_ARBITRUM_ONE_SEPOLIA_CREATE,
    price: 1,
  },
  {
    product_id: ProductCode.CONTRACT_ARBITRUM_ONE_SEPOLIA_CALL,
    price: 1,
  },
  {
    product_id: ProductCode.CONTRACT_AVALANCHE_CREATE,
    price: 100,
  },
  {
    product_id: ProductCode.CONTRACT_AVALANCHE_CALL,
    price: 10,
  },
  {
    product_id: ProductCode.CONTRACT_AVALANCHE_SEPOLIA_CREATE,
    price: 1,
  },
  {
    product_id: ProductCode.CONTRACT_AVALANCHE_SEPOLIA_CALL,
    price: 1,
  },
  {
    product_id: ProductCode.CONTRACT_OPTIMISM_CREATE,
    price: 100,
  },
  {
    product_id: ProductCode.CONTRACT_OPTIMISM_CALL,
    price: 10,
  },
  {
    product_id: ProductCode.CONTRACT_OPTIMISM_SEPOLIA_CREATE,
    price: 1,
  },
  {
    product_id: ProductCode.CONTRACT_OPTIMISM_SEPOLIA_CALL,
    price: 1,
  },
  {
    product_id: ProductCode.CONTRACT_POLYGON_CREATE,
    price: 100,
  },
  {
    product_id: ProductCode.CONTRACT_POLYGON_CALL,
    price: 10,
  },
  {
    product_id: ProductCode.CONTRACT_POLYGON_AMOY_CREATE,
    price: 200,
  },
  {
    product_id: ProductCode.CONTRACT_POLYGON_AMOY_CALL,
    price: 20,
  },
];

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  for (const product of productInserts) {
    await queryFn(
      `
        INSERT INTO ${DbTables.PRODUCT} (id, name, description, status, service,
                                         category)
        VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        product.id,
        ProductCode[product.id],
        product.description,
        SqlModelStatus.ACTIVE,
        ProductService.CONTRACTS,
        product.category,
      ],
    );
  }

  for (const price of productPriceInserts) {
    await queryFn(
      `
        INSERT INTO ${DbTables.PRODUCT_PRICE} (product_id, price, status)
        VALUES (?, ?, ?);
      `,
      [price.product_id, price.price, SqlModelStatus.ACTIVE],
    );
  }
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const ids = productInserts.map((product) => product.id);
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
