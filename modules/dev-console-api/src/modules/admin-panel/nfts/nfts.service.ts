/*
https://docs.nestjs.com/providers#services
*/

import { NFTCollectionQueryFilter, NftsMicroservice } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';

@Injectable()
export class NftsService {
  async getNftCollectionsList(
    context: DevConsoleApiContext,
    query: NFTCollectionQueryFilter,
  ) {
    return (await new NftsMicroservice(context).listNftCollections(query)).data;
  }
}
