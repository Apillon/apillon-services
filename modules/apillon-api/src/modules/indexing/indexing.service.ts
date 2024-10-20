import { InfrastructureMicroservice } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class IndexingService {
  constructor() {}

  async getUrlForSourceCodeUpload(
    context: ApillonApiContext,
    indexer_uuid: string,
  ) {
    return (
      await new InfrastructureMicroservice(context).getUrlForSourceCodeUpload(
        indexer_uuid,
      )
    ).data;
  }

  async deployIndexer(context: ApillonApiContext, indexer_uuid: string) {
    return (
      await new InfrastructureMicroservice(context).deployIndexer(indexer_uuid)
    ).data;
  }
}
