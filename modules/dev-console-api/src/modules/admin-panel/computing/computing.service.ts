import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { ComputingMicroservice, DepositToClusterDto } from '@apillon/lib';

@Injectable()
export class ComputingService {
  async depositToPhalaCluster(
    context: DevConsoleApiContext,
    body: DepositToClusterDto,
  ) {
    return (
      await new ComputingMicroservice(context).depositToPhalaCluster(body)
    ).data;
  }
}
