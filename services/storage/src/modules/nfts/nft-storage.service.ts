import {
  AWS_S3,
  env,
  Lmas,
  LogType,
  runWithWorkers,
  ServiceName,
  streamToString,
} from '@apillon/lib';
import {
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../../config/types';
import { ServiceContext } from '../../context';
import { StorageCodeException } from '../../lib/exceptions';
import { Bucket } from '../bucket/models/bucket.model';
import { uploadFilesToIPFSRes } from '../ipfs/interfaces/upload-files-to-ipfs-res.interface';
import { IPFSService } from '../ipfs/ipfs.service';
import { FileUploadRequest } from '../storage/models/file-upload-request.model';
import { FileUploadSession } from '../storage/models/file-upload-session.model';

export class NftStorageService {
  static async prepareMetadataForCollection(
    event: { body: { imagesSession: string; metadataSession: string } },
    context: ServiceContext,
  ) {
    //#region Load data, execute validations and Sync images to IPFS
    //Get sessions
    const imagesSession = await new FileUploadSession(
      {},
      context,
    ).populateByUUID(event.body.imagesSession);

    if (!imagesSession.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_NOT_FOUND,
        status: 404,
      });
    }

    const metadataSession = await new FileUploadSession(
      {},
      context,
    ).populateByUUID(event.body.metadataSession);

    if (!metadataSession.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_NOT_FOUND,
        status: 404,
      });
    }

    //get bucket
    const bucket = await new Bucket({}, context).populateById(
      imagesSession.bucket_id,
    );

    //Get files in session (fileStatus must be of status 1)
    const imageFURs = (
      await new FileUploadRequest(
        {},
        context,
      ).populateFileUploadRequestsInSession(imagesSession.id, context)
    ).filter(
      (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
    );

    let imagesOnIPFSRes: uploadFilesToIPFSRes = undefined;
    try {
      imagesOnIPFSRes = await IPFSService.uploadFURsToIPFSFromS3({
        fileUploadRequests: imageFURs,
        wrapWithDirectory: true,
      });
    } catch (err) {
      await new Lmas().writeLog({
        context: context,
        project_uuid: bucket.project_uuid,
        logType: LogType.ERROR,
        message: 'Error uploading nft collection images to IPFS',
        location: 'NftStorageService/prepareMetadataForCollection',
        service: ServiceName.STORAGE,
        data: {
          files: imageFURs.map((x) => x.serialize()),
          error: err,
        },
      });
      throw err;
    }
    //#endregion

    //#region Prepare NFT metadata
    //Download each metadata file from s3, update image property and upload back to s3

    //Get files in session (fileStatus must be of status 1)
    const metadataFURs = (
      await new FileUploadRequest(
        {},
        context,
      ).populateFileUploadRequestsInSession(metadataSession.id, context)
    ).filter(
      (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
    );
    //S3 client
    const s3Client: AWS_S3 = new AWS_S3();

    await runWithWorkers(metadataFURs, 50, context, async (metadataFUR) => {
      if (
        !(await s3Client.exists(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          metadataFUR.s3FileKey,
        ))
      ) {
        //NOTE: Define flow, what happen in this case. My gues - we should probably throw error
        return;
      }

      const file = await s3Client.get(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        metadataFUR.s3FileKey,
      );

      const fileContent = JSON.parse(await streamToString(file.Body, 'utf-8'));
      if (fileContent.image) {
        fileContent.image =
          env.STORAGE_IPFS_GATEWAY +
          '/' +
          imagesOnIPFSRes.parentDirCID.toV0().toString() +
          '/' +
          fileContent.image;
      }

      await s3Client.upload(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        metadataFUR.s3FileKey,
        Buffer.from(JSON.stringify(fileContent), 'utf-8'),
        'application/json',
      );
    });

    //#endregion

    //#region Sync metadata to IPFS
    let metadataOnIPFSRes: uploadFilesToIPFSRes = undefined;
    try {
      metadataOnIPFSRes = await IPFSService.uploadFURsToIPFSFromS3({
        fileUploadRequests: metadataFURs,
        wrapWithDirectory: true,
      });
    } catch (err) {
      await new Lmas().writeLog({
        context: context,
        project_uuid: bucket.project_uuid,
        logType: LogType.ERROR,
        message: 'Error uploading collection metadata to IPFS',
        location: 'NftStorageService/prepareMetadataForCollection',
        service: ServiceName.STORAGE,
        data: {
          files: imageFURs.map((x) => x.serialize()),
          error: err,
        },
      });
      throw err;
    }
    //#endregion

    //TODO: Mark sessions as transferred and clear files from s3

    return {
      baseUri:
        env.STORAGE_IPFS_GATEWAY +
        metadataOnIPFSRes.parentDirCID.toV0().toString(),
    };
  }
}
