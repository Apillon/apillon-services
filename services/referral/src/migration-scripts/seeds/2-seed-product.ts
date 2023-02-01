import { DbTables } from '../../config/types';
import { AttributeType } from '../../modules/referral/models/attribute.model';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PRODUCT} (id, name, description, imageUrl, price, stock, maxOrderCount, status)
    VALUES 
    (1, 'Merch Pack', 'Merch Pack containing one Apillon shirt and one pair of Apillon socks.', 'https://static.apillon.io/images/stuff.jpg', 12, 50, 1, 5)
  `);

  await queryFn(`
    INSERT INTO ${DbTables.ATTRIBUTE} (product_id, inputType, options, name, description, status)
    VALUES 
    (1, ${AttributeType.SIZE}, '["S", "M", "L", "XL"]', 'Shirt', 'Shirt size', 5),
    (1, ${AttributeType.SIZE}, '["35-38", "39-42", "43-46"]', 'Sock', 'Sock size', 5)
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PRODUCT}
    WHERE id = 1;
  `);
}
