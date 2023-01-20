import { NftsMicroservice } from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
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
}
