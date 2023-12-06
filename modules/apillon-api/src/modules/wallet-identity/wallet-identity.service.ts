import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { BlockchainMicroservice, WalletIdentityDto } from '@apillon/lib';

@Injectable()
export class WalletIdentityService {
  async getWalletIdentity(
    context: ApillonApiContext,
    query: WalletIdentityDto,
  ) {
    return (await new BlockchainMicroservice(context).getWalletIdentity(query))
      .data;
  }
}
