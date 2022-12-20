import { Injectable } from '@nestjs/common';
import { ReferralMicroservice, CreateReferralDto } from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class ReferralService {
  async createReferral(context: DevConsoleApiContext, body: CreateReferralDto) {
    return (await new ReferralMicroservice(context).createReferral(body)).data;
  }
}
