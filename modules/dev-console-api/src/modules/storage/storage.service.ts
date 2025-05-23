import {
  BaseProjectQueryFilter,
  CreateS3UrlsForUploadDto,
  EndFileUploadSessionDto,
  FileDetailsQueryFilter,
  FileUploadSessionQueryFilter,
  FileUploadsQueryFilter,
  FilesQueryFilter,
  GetLinksDto,
  GetProjectLinksDto,
  LinkOnIpfsQueryFilter,
  SqlModelStatus,
  StorageMicroservice,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
@Injectable()
export class StorageService {
  async getStorageInfo(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (
      await new StorageMicroservice(context).getStorageInfo(query.project_uuid)
    ).data;
  }

  async getIpfsClusterInfo(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (
      await new StorageMicroservice(context).getIpfsClusterInfo(
        query.project_uuid,
      )
    ).data;
  }

  async getLink(context: DevConsoleApiContext, query: LinkOnIpfsQueryFilter) {
    return (
      await new StorageMicroservice(context).getLink(
        query.project_uuid,
        query.cid,
        query.type,
      )
    ).data;
  }

  async getLinks(context: DevConsoleApiContext, body: GetProjectLinksDto) {
    return (
      await new StorageMicroservice(context).getLinks(body.project_uuid, body)
    ).data;
  }

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

  async listFileUploadSessions(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    query: FileUploadSessionQueryFilter,
  ) {
    query.bucket_uuid = bucket_uuid;
    return (
      await new StorageMicroservice(context).listFileUploadSessions(query)
    ).data;
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
   * Retrieves list of files in bucket
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} bucket_uuid - An UUID of the bucket the files are in.
   * @param {FilesQueryFilter} query - An object for filtering the results.
   * @returns - A list of files
   */
  async listFiles(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    query: FilesQueryFilter,
  ) {
    query.populate({ bucket_uuid, status: SqlModelStatus.ACTIVE });
    return (await new StorageMicroservice(context).listFiles(query)).data;
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
    uuid: string,
  ) {
    const filter: FileDetailsQueryFilter = new FileDetailsQueryFilter(
      { bucket_uuid: bucket_uuid, uuid },
      context,
    );
    return (await new StorageMicroservice(context).getFileDetails(filter)).data;
  }

  /**
   * Retrieves list of files that were deleted, but are still pinned on CRUST
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} bucket_uuid - An UUID of the bucket the files are in.
   * @param {FilesQueryFilter} query - An object for filtering the results.
   * @returns - A list of deleted files
   */
  async listDeletedFiles(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    query: FilesQueryFilter,
  ) {
    query.populate({ bucket_uuid, status: SqlModelStatus.DELETED });
    return (await new StorageMicroservice(context).listFiles(query)).data;
  }

  /**
   * Marks a file for deletion from the storage.
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} uuid - The UUID of the file
   * @returns - Service response
   */
  async deleteFile(context: DevConsoleApiContext, uuid: string) {
    return (await new StorageMicroservice(context).deleteFile({ uuid })).data;
  }

  /**
   * Set file back to active
   * @param {DevConsoleApiContext} context - An object containing information about user session.
   * @param {string} uuid - The UUID of the file
   * @returns - Service response
   */
  async restoreFile(context: DevConsoleApiContext, uuid: string) {
    return (await new StorageMicroservice(context).restoreFile({ uuid })).data;
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
