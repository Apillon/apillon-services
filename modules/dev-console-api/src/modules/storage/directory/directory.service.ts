import { Injectable } from '@nestjs/common';
import {
  CreateDirectoryDto,
  DirectoryContentQueryFilter,
  StorageMicroservice,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../../context';

@Injectable()
export class DirectoryService {
  async listDirectoryContent(
    context: DevConsoleApiContext,
    query: DirectoryContentQueryFilter,
  ) {
    return (await new StorageMicroservice(context).listDirectoryContent(query))
      .data;
  }
  async createDirectory(
    context: DevConsoleApiContext,
    body: CreateDirectoryDto,
  ) {
    return (await new StorageMicroservice(context).createDirectory(body)).data;
  }

  async updateDirectory(
    context: DevConsoleApiContext,
    directory_uuid: string,
    body: any,
  ) {
    return (
      await new StorageMicroservice(context).updateDirectory({
        directory_uuid,
        data: body,
      })
    ).data;
  }

  async cancelDirectoryDeletion(
    context: DevConsoleApiContext,
    directory_uuid: string,
  ) {
    return (
      await new StorageMicroservice(context).cancelDirectoryDeletion({
        directory_uuid,
      })
    ).data;
  }

  async deleteDirectory(context: DevConsoleApiContext, directory_uuid: string) {
    return (
      await new StorageMicroservice(context).deleteDirectory({
        directory_uuid,
      })
    ).data;
  }
}
