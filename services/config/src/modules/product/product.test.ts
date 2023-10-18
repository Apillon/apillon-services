import { releaseStage, setupTest, Stage } from '../../../test/setup';
import {
  PricelistQueryFilter,
  ProductCategory,
  ProductService as ProductServices,
} from '@apillon/lib';
import { ProductService } from './product.service';
import { ScsCodeException } from '../../lib/exceptions';

describe('Product unit tests', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('List product pricelist', async () => {
    const result = await ProductService.getProductPricelist(
      { query: new PricelistQueryFilter() },
      stage.context,
    );
    expect(result.items.length).toBeGreaterThanOrEqual(20); // From seed
    expect(result.total).toBeGreaterThanOrEqual(20);
    result.items.forEach((item) => {
      expect(item.name).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.service).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.currentPrice).toBeGreaterThanOrEqual(0);
    });
  });

  test('List product pricelist by service and category', async () => {
    const { items: serviceItems } = await ProductService.getProductPricelist(
      {
        query: new PricelistQueryFilter({ service: ProductServices.NFT }),
      },
      stage.context,
    );

    expect(serviceItems.length).toBeLessThan(20);
    serviceItems.forEach((item) => {
      expect(item.service).toBe(ProductServices.NFT);
    });

    const { items: categoryItems } = await ProductService.getProductPricelist(
      {
        query: new PricelistQueryFilter({ category: ProductCategory.WEBSITE }),
      },
      stage.context,
    );

    expect(categoryItems.length).toBeLessThan(20);
    categoryItems.forEach((item) => {
      expect(item.category).toBe(ProductCategory.WEBSITE);
    });
  });

  test('Get a single product', async () => {
    const product = await ProductService.getProductPrice(
      { product_id: 1 }, // Hosting website
      stage.context,
    );
    expect(product.name).toBeTruthy();
    expect(product.description).toBeTruthy();
    expect(product.service).toBe(ProductServices.HOSTING);
    expect(product.category).toBe(ProductCategory.WEBSITE);
    expect(product.currentPrice).toBeGreaterThanOrEqual(100);
  });

  test('Throw an error if product not found', async () => {
    await expect(async () => {
      await ProductService.getProductPrice({ product_id: 6156 }, stage.context);
    }).rejects.toThrowError(ScsCodeException);
  });
});
