import { NftsMicroservice } from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { Injectable } from '@nestjs/common';
import { url } from 'inspector';
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
    address: string,
  ) {
    return (
      await new NftsMicroservice(context).transferNftOwnership(
        collection_uuid,
        address,
      )
    ).data;
  }

  async setNftCollectionBaseUri(
    context: DevConsoleApiContext,
    collection_uuid: string,
    baseUri: string,
  ) {
    return (
      await new NftsMicroservice(context).setNftCollectionBaseUri(
        collection_uuid,
        baseUri,
      )
    ).data;
  }
}
