import {
  CreateS3UrlsForUploadDto,
  EndFileUploadSessionDto,
  FileDetailsQueryFilter,
  FileUploadsQueryFilter,
  StorageMicroservice,
  TrashedFilesQueryFilter,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
@Injectable()
export class StorageService {
  /**
   * Retrieves a list of file uploads for a given bucket based on provided filters.
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} bucket_uuid - An UUID of the bucket to retrieve file uploads from.
   * @param {FileUploadsQueryFilter} query - An object containing optional filters to apply to the query.
   * @returns - An array of file upload objects.
   */
  async listFileUploads(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    query: FileUploadsQueryFilter,
  ) {
    query.bucket_uuid = bucket_uuid;
    return (await new StorageMicroservice(context).listFileUploads(query)).data;
  }

  /**
   * Ends an active file upload session for a given bucket.
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} bucket_uuid - An UUID of the bucket associated with the file upload session.
   * @param {string} session_uuid - An UUID of the file upload session to end.
   * @param {EndFileUploadSessionDto} body - An object containing additional details to include in the session end request.
   * @returns - An object representing the end result of the file upload session.
   */
  async endFileUploadSession(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    session_uuid: string,
    body: EndFileUploadSessionDto,
  ) {
    return (
      await new StorageMicroservice(context).endFileUploadSession(
        session_uuid,
        body,
      )
    ).data;
  }

  /**
   * Generates a signed URL for uploading a file to an S3 bucket.
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} bucket_uuid - An UUID of the bucket to upload the file to.
   * @param {CreateS3UrlsForUploadDto} body - An object containing details about the file being uploaded.
   * @returns - An object containing signed URLs for the file upload.
   */
  async createS3SignedUrlsForUpload(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    body: CreateS3UrlsForUploadDto,
  ) {
    body.bucket_uuid = bucket_uuid;
    return (
      await new StorageMicroservice(context).requestS3SignedURLsForUpload(body)
    ).data;
  }

  /**
   * Syncs a file to IPFS.
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param file_uuid - An UUID of the file to sync to IPFS.
   * @returns - An object representing the result of the file sync.
   */
  async syncFileToIPFS(context: DevConsoleApiContext, file_uuid: string) {
    return (await new StorageMicroservice(context).syncFileToIPFS(file_uuid))
      .data;
  }

  /**
   * Retrieves details about a file.
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} bucket_uuid - An UUID of the bucket the file is in.
   * @param {string} id - An id of the file to retrieve details for.
   * @returns - An object containing details about the file.
   */
  async getFileDetails(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    id: string,
  ) {
    const filter: FileDetailsQueryFilter = new FileDetailsQueryFilter(
      { bucket_uuid: bucket_uuid, id: id },
      context,
    );
    return (await new StorageMicroservice(context).getFileDetails(filter)).data;
  }

  /**
   * Retrieves list of files that are going to be removed from storage
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} bucket_uuid - An UUID of the bucket the files are in.
   * @param {TrashedFilesQueryFilter} query - An object for filtering the results.
   * @returns - A list of files marked for deletion
   */
  async listFilesMarkedForDeletion(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    query: TrashedFilesQueryFilter,
  ) {
    query.populate({ bucket_uuid });
    return (
      await new StorageMicroservice(context).listFilesMarkedForDeletion(query)
    ).data;
  }

  /**
   * Marks a file for deletion from the storage.
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} id - The ID of the file
   * @returns - Service response
   */
  async deleteFile(context: DevConsoleApiContext, id: string) {
    return (await new StorageMicroservice(context).deleteFile({ id })).data;
  }

  /**
   * Cancels deletion of a file from the storage.
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} id - The ID of the file
   * @returns - Service response
   */
  async cancelFileDeletion(context: DevConsoleApiContext, id: string) {
    return (await new StorageMicroservice(context).cancelFileDeletion({ id }))
      .data;
  }

  async testCrustProvider(
    context: DevConsoleApiContext,
    providerEndpoint: string,
  ) {
    return (
      await new StorageMicroservice(context).testCrustProvider(providerEndpoint)
    ).data;
  }
}
