import {
  AWS_S3,
  env,
  Lmas,
  LogType,
  PrepareCollectionMetadataDTO,
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
    event: { body: PrepareCollectionMetadataDTO },
    context: ServiceContext,
  ) {
    //#region Sync images to IPFS
    //Get session
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

    for (const metadataFUR of metadataFURs) {
      if (
        !(await s3Client.exists(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          metadataFUR.s3FileKey,
        ))
      ) {
        //NOTE: Define flow, what happen in this case. My gues - we should probably throw error
        continue;
      }

      const file = await s3Client.get(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        metadataFUR.s3FileKey,
      );

      const fileContent = JSON.parse(await streamToString(file.Body, 'utf-8'));
      if (fileContent.image) {
        fileContent.image =
          imagesOnIPFSRes.parentDirCID + '/' + fileContent.image;
      }

      await s3Client.upload(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        metadataFUR.s3FileKey,
        fileContent,
        'application/json',
      );
    }

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

    return { collectionMetadataCid: metadataOnIPFSRes.parentDirCID };
  }
}
