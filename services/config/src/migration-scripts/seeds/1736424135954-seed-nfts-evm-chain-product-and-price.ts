import { DbTables } from '../../config/types';
import {
  ProductCategory,
  ProductCode,
  ProductService,
  SqlModelStatus,
} from '@apillon/lib';

const productInserts = [
  {
    id: ProductCode.NFT_ARBITRUM_ONE_COLLECTION,
    description: 'Create new NFT collection on Arbitrum One',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_ARBITRUM_ONE_MINT,
    description: 'Mint NFT on Arbitrum One',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_ARBITRUM_ONE_BURN,
    description: 'Burn NFT on Arbitrum One',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_ARBITRUM_ONE_TRANSFER_COLLECTION,
    description: 'Transfer NFT collection on Arbitrum One',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_ARBITRUM_ONE_SET_BASE_URI,
    description: 'Set NFT collection base URI on Arbitrum One',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_COLLECTION,
    description: 'Create new NFT collection on Arbitrum One Sepolia',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_MINT,
    description: 'Mint NFT on Arbitrum One Sepolia',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_BURN,
    description: 'Burn NFT on Arbitrum One Sepolia',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_TRANSFER_COLLECTION,
    description: 'Transfer NFT collection on Arbitrum One Sepolia',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_SET_BASE_URI,
    description: 'Set NFT collection base URI on Arbitrum One Sepolia',
    category: ProductCategory.ARBITRUM_ONE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_COLLECTION,
    description: 'Create new NFT collection on Avalanche',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_MINT,
    description: 'Mint NFT on Avalanche',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_BURN,
    description: 'Burn NFT on Avalanche',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_TRANSFER_COLLECTION,
    description: 'Transfer NFT collection on Avalanche',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_SET_BASE_URI,
    description: 'Set NFT collection base URI on Avalanche',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_FUJI_COLLECTION,
    description: 'Create new NFT collection on Avalanche Fuji',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_FUJI_MINT,
    description: 'Mint NFT on Avalanche Fuji',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_FUJI_BURN,
    description: 'Burn NFT on Avalanche Fuji',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_FUJI_TRANSFER_COLLECTION,
    description: 'Transfer NFT collection on Avalanche Fuji',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_AVALANCHE_FUJI_SET_BASE_URI,
    description: 'Set NFT collection base URI on Avalanche Fuji',
    category: ProductCategory.AVALANCHE_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_COLLECTION,
    description: 'Create new NFT collection on Optimism',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_MINT,
    description: 'Mint NFT on Optimism',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_BURN,
    description: 'Burn NFT on Optimism',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_TRANSFER_COLLECTION,
    description: 'Transfer NFT collection on Optimism',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_SET_BASE_URI,
    description: 'Set NFT collection base URI on Optimism',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_SEPOLIA_COLLECTION,
    description: 'Create new NFT collection on Optimism Sepolia',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_SEPOLIA_MINT,
    description: 'Mint NFT on Optimism Sepolia',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_SEPOLIA_BURN,
    description: 'Burn NFT on Optimism Sepolia',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_SEPOLIA_TRANSFER_COLLECTION,
    description: 'Transfer NFT collection on Optimism Sepolia',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_OPTIMISM_SEPOLIA_SET_BASE_URI,
    description: 'Set NFT collection base URI on Optimism Sepolia',
    category: ProductCategory.OPTIMISM_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_COLLECTION,
    description: 'Create new NFT collection on Polygon',
    category: ProductCategory.POLYGON_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_MINT,
    description: 'Mint NFT on Polygon',
    category: ProductCategory.POLYGON_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_BURN,
    description: 'Burn NFT on Polygon',
    category: ProductCategory.POLYGON_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_TRANSFER_COLLECTION,
    description: 'Transfer NFT collection on Polygon',
    category: ProductCategory.POLYGON_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_SET_BASE_URI,
    description: 'Set NFT collection base URI on Polygon',
    category: ProductCategory.POLYGON_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_AMOY_COLLECTION,
    description: 'Create new NFT collection on Polygon Amoy',
    category: ProductCategory.POLYGON_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_AMOY_MINT,
    description: 'Mint NFT on Polygon Amoy',
    category: ProductCategory.POLYGON_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_AMOY_BURN,
    description: 'Burn NFT on Polygon Amoy',
    category: ProductCategory.POLYGON_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_AMOY_TRANSFER_COLLECTION,
    description: 'Transfer NFT collection on Polygon Amoy',
    category: ProductCategory.POLYGON_NFT,
  },
  {
    id: ProductCode.NFT_POLYGON_AMOY_SET_BASE_URI,
    description: 'Set NFT collection base URI on Polygon Amoy',
    category: ProductCategory.POLYGON_NFT,
  },
];

const productPriceInserts = [
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_COLLECTION,
    price: 500,
  },
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_MINT,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_BURN,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_TRANSFER_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_SET_BASE_URI,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_MINT,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_BURN,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_TRANSFER_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_ARBITRUM_ONE_SEPOLIA_SET_BASE_URI,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_MINT,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_BURN,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_TRANSFER_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_SET_BASE_URI,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_FUJI_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_FUJI_MINT,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_FUJI_BURN,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_FUJI_TRANSFER_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_AVALANCHE_FUJI_SET_BASE_URI,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_MINT,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_BURN,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_TRANSFER_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_SET_BASE_URI,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_SEPOLIA_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_SEPOLIA_MINT,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_SEPOLIA_BURN,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_SEPOLIA_TRANSFER_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_OPTIMISM_SEPOLIA_SET_BASE_URI,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_MINT,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_BURN,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_TRANSFER_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_SET_BASE_URI,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_AMOY_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_AMOY_MINT,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_AMOY_BURN,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_AMOY_TRANSFER_COLLECTION,
    price: 2,
  },
  {
    product_id: ProductCode.NFT_POLYGON_AMOY_SET_BASE_URI,
    price: 2,
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
        ProductService.NFT,
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
