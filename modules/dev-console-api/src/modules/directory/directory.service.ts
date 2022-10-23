import { Injectable } from '@nestjs/common';
import { CreateDirectoryDto, StorageMicroservice } from 'at-lib';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class DirectoryService {
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

  async deleteDirectory(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).deleteDirectory({ id: id }))
      .data;
  }
}
