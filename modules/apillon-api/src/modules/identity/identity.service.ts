import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { BlockchainMicroservice, WalletIdentityDto } from '@apillon/lib';

@Injectable()
export class IdentityService {
  async getWalletIdentity(context: ApillonApiContext, body: WalletIdentityDto) {
    return (await new BlockchainMicroservice(context).getWalletIdentity(body))
      .data;
  }
}
