import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { SocialMicroservice, WalletIdentityDto } from '@apillon/lib';

@Injectable()
export class WalletIdentityService {
  async getWalletIdentity(
    context: ApillonApiContext,
    query: WalletIdentityDto,
  ) {
    return (await new SocialMicroservice(context).getWalletIdentity(query))
      .data;
  }
}
