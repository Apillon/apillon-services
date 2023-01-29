import { StorageMicroservice } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class HostingService {
  async listDomains(context: ApillonApiContext) {
    return (await new StorageMicroservice(context).listDomains()).data;
  }
}
