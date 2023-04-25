import { Lmas, LogType, ServiceName } from '@apillon/lib';
import { DbTables, FileStatus } from '../config/types';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { CrustService } from '../modules/crust/crust.service';
import { File } from '../modules/storage/models/file.model';
import { Directory } from '../modules/directory/models/directory.model';
import { CID } from 'ipfs-http-client';

/**
 * Function to execute PinToCRUST
 * @param context
 * @param CID
 */
export async function pinFileToCRUST(
  context,
  bucket_uuid,
  CID: CID,
  size: number,
  isDirectory: boolean,
) {
  const bucket: Bucket = await new Bucket({}, context).populateByUUID(
    bucket_uuid,
  );

  try {
    let refId = undefined;
    if (isDirectory) {
      const dir: Directory = await new Directory({}, context).populateByCid(
        CID.toV0().toString(),
      );
      if (dir.exists()) {
        refId = dir.CID;
      }
    } else {
      const file: File = await new File({}, context).populateById(
        CID.toV0().toString(),
      );
      //if file, then update file status
      if (file.exists()) {
        file.fileStatus = FileStatus.PINNING_TO_CRUST;
        await file.update();
        refId = file.file_uuid;
      }
    }

    const res = await CrustService.placeStorageOrderToCRUST(
      {
        cid: CID,
        size: size,
        isDirectory: isDirectory,
        refTable: isDirectory ? DbTables.DIRECTORY : DbTables.FILE,
        refId: refId,
      },
      context,
    );
    await new Lmas().writeLog({
      context: context,
      project_uuid: bucket.project_uuid,
      logType: LogType.COST,
      message: 'Success placing storage order to CRUST',
      location: `${this.constructor.name}/runExecutor`,
      service: ServiceName.STORAGE,
    });
  } catch (err) {
    await new Lmas().writeLog({
      context: context,
      project_uuid: bucket.project_uuid,
      logType: LogType.ERROR,
      message: 'Error at placing storage order to CRUST',
      location: `${this.constructor.name}/runExecutor`,
      service: ServiceName.STORAGE,
      data: {
        err,
      },
    });
    throw err;
  }
}
