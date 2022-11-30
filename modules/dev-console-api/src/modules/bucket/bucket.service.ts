import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateBucketDto,
  StorageMicroservice,
  BucketQueryFilter,
  CodeException,
} from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';

@Injectable()
export class BucketService {
  async getBucketList(context: DevConsoleApiContext, query: BucketQueryFilter) {
    return (await new StorageMicroservice(context).listBuckets(query)).data;
  }

  async createBucket(context: DevConsoleApiContext, body: CreateBucketDto) {
    const project: Project = await new Project({}, context).populateByUUID(
      body.project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canModify(context);

    //Call Storage microservice, to create bucket
    return (await new StorageMicroservice(context).createBucket(body)).data;
  }

  async updateBucket(context: DevConsoleApiContext, id: number, body: any) {
    return (
      await new StorageMicroservice(context).updateBucket({
        id: id,
        data: body,
      })
    ).data;
  }

  async deleteBucket(context: DevConsoleApiContext, id: number) {
    return (await new StorageMicroservice(context).deleteBucket({ id: id }))
      .data;
  }
}
