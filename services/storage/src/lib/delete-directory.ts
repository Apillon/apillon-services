import { Context, PoolConnection, SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../config/types';
import { Directory } from '../modules/directory/models/directory.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { ProjectConfig } from '../modules/config/models/project-config.model';

/**
 * Function to delete directories, subdirectories and files. All files are unpinned from ipfs.
 * DB transaction should be handled in calling function!
 * Bucket size should also be decreased in calling function.
 * @param context
 * @param directory_id
 * @param conn
 */
export async function deleteDirectory(
  context: Context,
  directory: Directory,
  conn: PoolConnection,
): Promise<{ sizeOfDeletedFiles: number; deletedFiles: any[] }> {
  let sizeOfDeletedFiles = 0;
  const deletedFiles: any[] = [];

  //Get all subdirectories and recursive call delete of sub directories
  const subDirectories = await context.mysql.paramExecute(
    `
      SELECT * 
      FROM \`${DbTables.DIRECTORY}\`
      WHERE status = ${SqlModelStatus.ACTIVE} AND parentDirectory_id = @directory_id
      `,
    { directory_id: directory.id },
    conn,
  );

  for (const subDirectory of subDirectories) {
    const subDir = new Directory(subDirectory, context);
    const delSubDirectoriesRes = await deleteDirectory(context, subDir, conn);
    sizeOfDeletedFiles += delSubDirectoriesRes.sizeOfDeletedFiles;
  }

  //Get all files in directory, unpin them from IPFS and mark them as deleted
  const filesInDirectory = await context.mysql.paramExecute(
    `
      SELECT * 
      FROM \`${DbTables.FILE}\`
      WHERE status <> ${SqlModelStatus.DELETED}
      AND directory_id = @directory_id
      `,
    { directory_id: directory.id },
    conn,
  );

  const ipfsCluster = await new ProjectConfig(
    { project_uuid: directory.project_uuid },
    context,
  ).getIpfsCluster();

  const unpinPromises = [];
  const ipfsService = await new IPFSService(context, directory.project_uuid);

  for (const file of filesInDirectory) {
    if (file.CID) {
      unpinPromises.push(
        ipfsService.unpinCidFromCluster(file.CID, ipfsCluster),
      );
    }
    sizeOfDeletedFiles += file.size;
    deletedFiles.push(file);
  }
  if (unpinPromises.length) {
    await Promise.all(unpinPromises);
  }

  await context.mysql.paramExecute(
    `
      UPDATE \`${DbTables.FILE}\`
      SET status = ${SqlModelStatus.DELETED}
      WHERE status <> ${SqlModelStatus.DELETED} 
      AND directory_id = @directory_id
      `,
    { directory_id: directory.id },
    conn,
  );

  await directory.markDeleted(conn);

  return { sizeOfDeletedFiles, deletedFiles };
}
