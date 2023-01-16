import { NftsMicroservice } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class NftsService {
  async getHello(context: DevConsoleApiContext) {
    return (await new NftsMicroservice(context).getHello()).data;
  }
}
