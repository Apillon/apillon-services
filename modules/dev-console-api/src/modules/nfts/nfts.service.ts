import { NftsMicroservice } from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { TransferNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/transfer-nft-query-filter.dto';
import { MintNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/mint-nft-query-filter.dto';
import { SetNftBaseUriQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/set-nft-base-uri-query.dto';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class NftsService {
  async getHello(context: DevConsoleApiContext) {
    return (await new NftsMicroservice(context).getHello()).data;
  }

  async deployNftContract(
    context: DevConsoleApiContext,
    body: DeployNftContractDto,
  ) {
    return (await new NftsMicroservice(context).deployNftContract(body)).data;
  }

  async transferNftOwnership(
    context: DevConsoleApiContext,
    collection_uuid: string,
    query: TransferNftQueryFilter,
  ) {
    query.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).transferNftOwnership(query))
      .data;
  }

  async mintNftTo(
    context: DevConsoleApiContext,
    collection_uuid: string,
    query: MintNftQueryFilter,
  ) {
    query.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).mintNft(query)).data;
  }

  async setNftCollectionBaseUri(
    context: DevConsoleApiContext,
    collection_uuid: string,
    query: SetNftBaseUriQueryFilter,
  ) {
    query.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).setNftCollectionBaseUri(query))
      .data;
  }
}
