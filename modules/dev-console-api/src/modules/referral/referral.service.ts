import { Injectable } from '@nestjs/common';
import { ReferralMicroservice } from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class ReferralService {
  async createReferral(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).createReferral()).data;
  }
}
