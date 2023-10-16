import { PricelistQueryFilter, SerializeFor } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Product } from './models/product.model';
import { ScsCodeException } from '../../lib/exceptions';
import { ConfigErrorCode } from '../../config/types';

export class ProductService {
  /**
   * Query all products in the database, join with productPrice table to populate prices
   * @param {{ query: PricelistQueryFilter }} event
   * @param {ServiceContext} context
   */
  static async getProductPricelist(
    event: { query: PricelistQueryFilter },
    context: ServiceContext,
  ) {
    return await new Product({}, context).getList(event.query, context);
  }

  /**
   * Get a product by its ID and populate its price
   * @param {{ product_id: number }} event
   * @param {ServiceContext} context
   * @returns {Promise<Product>}
   */
  static async getProductPrice(
    event: { product_id: number },
    context: ServiceContext,
  ): Promise<Product> {
    const product = await new Product({}, context).populateById(
      event.product_id,
    );
    if (!product.exists()) {
      throw new ScsCodeException({
        code: ConfigErrorCode.PRODUCT_DOES_NOT_EXISTS,
        status: 404,
        context,
        sourceFunction: 'getProductWithPrice()',
        sourceModule: 'ProductService',
        errorMessage: 'Product does not exists',
      });
    }

    await product.populateCurrentPrice();
    return product.serialize(SerializeFor.PROFILE) as Product;
  }
}
