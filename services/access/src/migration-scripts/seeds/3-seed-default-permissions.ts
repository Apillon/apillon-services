import { DefaultPermission } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.PERMISSION} (id, status, name)
    VALUES 
     (${DefaultPermission.STORAGE}, 5, 'Storage permission'),
     (${DefaultPermission.HOSTING}, 5, 'Hosting permission'),
     (${DefaultPermission.AUTHENTICATION}, 5, 'Authentication (KILT) permission'),
     (${DefaultPermission.NFTS}, 5, 'Nfts permission'),
     (${DefaultPermission.COMPUTING}, 5, 'Nfts permission')
    ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM ${DbTables.PERMISSION}
    WHERE id IN (
      ${DefaultPermission.STORAGE}, 
      ${DefaultPermission.HOSTING}, 
      ${DefaultPermission.AUTHENTICATION}, 
      ${DefaultPermission.NFTS},
      ${DefaultPermission.COMPUTING}
    );
  `);
}
