import { Injectable } from '@nestjs/common';
import {
  CreateDirectoryDto,
  DirectoryContentQueryFilter,
  StorageMicroservice,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';

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

  async updateDirectory(context: DevConsoleApiContext, id: number, body: any) {
    return (
      await new StorageMicroservice(context).updateDirectory({
        id: id,
        data: body,
      })
    ).data;
  }

  async cancelDirectoryDeletion(context: DevConsoleApiContext, id: number) {
    return (
      await new StorageMicroservice(context).cancelDirectoryDeletion({ id: id })
    ).data;
  }

  async deleteDirectory(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).deleteDirectory({ id: id }))
      .data;
  }
}
