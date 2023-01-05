import { Context, SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../config/types';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';

export async function deleteBucket(context: Context, bucket_id: number) {
  const b: Bucket = await new Bucket({}, context).populateById(bucket_id);

  //Get all files in bucket, unpin them from IPFS
  const filesInBucket = await context.mysql.paramExecute(
    `
      SELECT * 
      FROM \`${DbTables.FILE}\`
      WHERE status = ${SqlModelStatus.ACTIVE}
      AND bucket_id = @bucket_id
      `,
    { bucket_id },
  );

  for (const file of filesInBucket) {
    if (file.CID) await IPFSService.unpinFile(file.CID);
  }

  await context.mysql.paramExecute(
    `
      UPDATE \`${DbTables.FILE}\`
      SET status = ${SqlModelStatus.DELETED}
      WHERE status <> ${SqlModelStatus.DELETED} 
      AND bucket_id = @bucket_id
      `,
    { bucket_id },
  );

  await b.markDeleted();
}
