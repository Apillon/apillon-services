import { Context, PoolConnection, SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../config/types';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';

/**
 * Function to delete bucket and all directories and files inside it. DB transaction should be handled in calling function!
 * @param context
 * @param bucket_id
 * @param conn
 */
export async function deleteBucket(
  context: Context,
  bucket_id: number,
  conn: PoolConnection,
) {
  const b: Bucket = await new Bucket({}, context).populateById(bucket_id, conn);

  //Get all files in bucket, unpin them from IPFS
  const filesInBucket = await context.mysql.paramExecute(
    `
      SELECT * 
      FROM \`${DbTables.FILE}\`
      WHERE status = ${SqlModelStatus.ACTIVE}
      AND bucket_id = @bucket_id
      `,
    { bucket_id },
    conn,
  );

  for (const file of filesInBucket) {
    if (file.CID) {
      await new IPFSService(context, b.project_uuid).unpinFile(file.CID);
    }
  }

  //Delete files
  await context.mysql.paramExecute(
    `
      UPDATE \`${DbTables.FILE}\`
      SET status = ${SqlModelStatus.DELETED}
      WHERE status <> ${SqlModelStatus.DELETED} 
      AND bucket_id = @bucket_id
      `,
    { bucket_id },
    conn,
  );
  //Delete directories
  await context.mysql.paramExecute(
    `
      UPDATE \`${DbTables.DIRECTORY}\`
      SET status = ${SqlModelStatus.DELETED}
      WHERE status <> ${SqlModelStatus.DELETED} 
      AND bucket_id = @bucket_id
      `,
    { bucket_id },
    conn,
  );
  //Delete bucket
  await b.markDeleted(conn);
}
