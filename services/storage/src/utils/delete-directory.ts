import { Context, PoolConnection, SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../config/types';
import { Directory } from '../modules/directory/models/directory.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';

/**
 * Function, to recursive delete directories and all subdirectories. DB transaction should be handled in calling function!
 * @param context
 * @param directory_id
 * @param conn
 */
export async function deleteDirectory(
  context: Context,
  directory_id: number,
  conn: PoolConnection,
): Promise<{ sizeOfDeletedFiles: number }> {
  const d: Directory = await new Directory({}, context).populateById(
    directory_id,
    conn,
  );

  let sizeOfDeletedFiles = 0;

  //Get all subdirectories and recursive call delete of sub directories
  const subDirectories = await context.mysql.paramExecute(
    `
      SELECT * 
      FROM \`${DbTables.DIRECTORY}\`
      WHERE status = ${SqlModelStatus.ACTIVE} AND parentDirectory_id = @directory_id
      `,
    { directory_id },
    conn,
  );

  for (const subDirectory of subDirectories) {
    const delSubDirectoriesRes = await deleteDirectory(
      context,
      subDirectory.id,
      conn,
    );
    sizeOfDeletedFiles += delSubDirectoriesRes.sizeOfDeletedFiles;
  }
  //Get all files in directory, unpin them from IPFS
  const filesInDirectory = await context.mysql.paramExecute(
    `
      SELECT * 
      FROM \`${DbTables.FILE}\`
      WHERE status <> ${SqlModelStatus.DELETED}
      AND directory_id = @directory_id
      `,
    { directory_id },
    conn,
  );

  for (const file of filesInDirectory) {
    if (file.CID) {
      await IPFSService.unpinFile(file.CID);
    }
    sizeOfDeletedFiles += file.size;
  }

  await context.mysql.paramExecute(
    `
      UPDATE \`${DbTables.FILE}\`
      SET status = ${SqlModelStatus.DELETED}
      WHERE status <> ${SqlModelStatus.DELETED} 
      AND directory_id = @directory_id
      `,
    { directory_id },
    conn,
  );

  await d.markDeleted(conn);

  return { sizeOfDeletedFiles };
}
