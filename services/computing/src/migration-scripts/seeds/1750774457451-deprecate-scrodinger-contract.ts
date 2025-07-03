import { DbTables } from '../../config/types';
import { ComputingContractType, SqlModelStatus } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `UPDATE ${DbTables.CONTRACT_ABI}
     SET status = ${SqlModelStatus.INACTIVE}
     WHERE contractType = ${ComputingContractType.SCHRODINGER};`,
  );
  await queryFn(
    `UPDATE ${DbTables.CONTRACT}
     SET status = ${SqlModelStatus.INACTIVE}
     WHERE contractType = ${ComputingContractType.SCHRODINGER};`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `UPDATE ${DbTables.CONTRACT_ABI}
     SET status = ${SqlModelStatus.ACTIVE}
     WHERE contractType = ${ComputingContractType.SCHRODINGER};`,
  );
  await queryFn(
    `UPDATE ${DbTables.CONTRACT}
     SET status = ${SqlModelStatus.ACTIVE}
     WHERE contractType = ${ComputingContractType.SCHRODINGER};`,
  );
}
