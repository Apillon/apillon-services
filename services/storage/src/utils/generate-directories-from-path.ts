import { PoolConnection, SerializeFor } from '@apillon/lib';
import { CID } from 'ipfs-http-client';
import { ServiceContext } from '../context';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { Directory } from '../modules/directory/models/directory.model';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { v4 as uuidV4 } from 'uuid';
import {
  StorageCodeException,
  StorageValidationException,
} from '../lib/exceptions';
import { StorageErrorCode } from '../config/types';

/**
 * From fur(File upload request).path generate directories with hiearhical structure, or return existing directory if fur.directory_uuid is specified
 */
export async function generateDirectoriesForFUR(
  context: ServiceContext,
  directories: Directory[],
  fur: FileUploadRequest,
  bucket: Bucket,
  ipfsDirectories?: { path: string; cid: CID }[],
  conn?: PoolConnection,
): Promise<Directory> {
  if (fur.directory_uuid) {
    const d: Directory = await new Directory({}, context).populateByUUID(
      fur.directory_uuid,
    );
    if (!d.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.DIRECTORY_NOT_FOUND,
        status: 404,
      });
    }
    return d;
  } else if (fur.path) {
    const splittedPath: string[] = fur.path.split('/').filter((x) => x != '');
    let currDirectory: Directory = undefined;

    //Get or create directory
    for (let i = 0; i < splittedPath.length; i++) {
      const currChildDirectories =
        i == 0
          ? directories.filter((x) => x.parentDirectory_id == undefined)
          : directories.filter((x) => x.parentDirectory_id == currDirectory.id);

      const existingDirectory = currChildDirectories.find(
        (x) => x.name == splittedPath[i],
      );

      if (!existingDirectory) {
        //create new directory
        const newDirectory: Directory = new Directory({}, context).populate({
          directory_uuid: uuidV4(),
          project_uuid: bucket.project_uuid,
          bucket_id: fur.bucket_id,
          parentDirectory_id: currDirectory?.id,
          name: splittedPath[i],
        });

        //search, if directory with that path, was created on IPFS
        const ipfsDirectory = ipfsDirectories?.find(
          (x) => x.path == splittedPath.slice(0, i + 1).join('/'),
        );
        if (ipfsDirectory)
          newDirectory.CID = ipfsDirectory.cid.toV0().toString();

        try {
          await newDirectory.validate();
        } catch (err) {
          await newDirectory.handle(err);
          if (!newDirectory.isValid())
            throw new StorageValidationException(newDirectory);
        }

        currDirectory = await newDirectory.insert(SerializeFor.INSERT_DB, conn);

        //Add new directory to list of all directories
        directories.push(currDirectory);
      } else currDirectory = existingDirectory;
    }
    return currDirectory;
  }
  return undefined;
}
