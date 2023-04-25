import { Lmas, LogType, ServiceName } from '@apillon/lib';
import { DbTables, FileStatus } from '../config/types';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { CrustService } from '../modules/crust/crust.service';
import { File } from '../modules/storage/models/file.model';

/**
 * Function to execute PinToCRUST
 * @param context
 * @param CID
 */
export async function pinFileToCRUST(
  context,
  bucket_uuid,
  CID,
  size,
  isDirectory,
) {
  const bucket: Bucket = await new Bucket({}, context).populateByUUID(
    bucket_uuid,
  );
  const file: File = await new File({}, context).populateById(CID);

  try {
    //if file, then update file status
    if (file.exists()) {
      file.fileStatus = FileStatus.PINNING_TO_CRUST;
      await file.update();
    }

    const res = await CrustService.placeStorageOrderToCRUST(
      {
        cid: CID,
        size: size,
        isDirectory: isDirectory,
        refTable: DbTables.FILE,
        refId: file?.file_uuid,
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
