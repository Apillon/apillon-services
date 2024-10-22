import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import {
  AssetManagementMicroservice,
  RefillWalletRequestDto,
} from '@apillon/lib';

@Injectable()
export class AssetManagementService {
  async refillWalletConfirm(
    context: DevConsoleApiContext,
    body: RefillWalletRequestDto,
  ) {
    return (
      await new AssetManagementMicroservice(context).refillWalletConfirm(body)
    ).data;
  }

  async refillWalletCancel(
    context: DevConsoleApiContext,
    body: RefillWalletRequestDto,
  ) {
    return (
      await new AssetManagementMicroservice(context).refillWalletCancel(body)
    ).data;
  }
}
