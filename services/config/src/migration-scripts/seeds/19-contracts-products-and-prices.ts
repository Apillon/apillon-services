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
  await queryFn(`SELECT 1`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`SELECT 1`);
}
