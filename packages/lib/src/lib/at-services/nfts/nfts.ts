import { add } from 'lodash';
import { env } from '../../../config/env';
import { AppEnvironment, NftsEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { DeployNftContractDto } from './dtos/deploy-nft-contract.dto';

export class NftsMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.NFTS_FUNCTION_NAME_TEST
      : env.NFTS_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.NFTS_SOCKET_PORT_TEST
      : env.NFTS_SOCKET_PORT;
  serviceName = 'NFTS';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  public async getHello() {
    const data = {
      eventName: NftsEventType.HELLO,
    };
    return await this.callService(data);
  }

  public async deployNftContract(params: DeployNftContractDto) {
    const data = {
      eventName: NftsEventType.DEPLOY_NFT,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async transferNftOwnership(collection_uuid: string, address: string) {
    const data = {
      eventName: NftsEventType.TRANSFER_OWNERSHIP,
      collection_uuid: collection_uuid,
      address: address,
    };
    return await this.callService(data);
  }

  public async setNftCollectionBaseUri(collection_uuid: string, uri: string) {
    const data = {
      eventName: NftsEventType.SET_BASE_URI,
      collection_uuid: collection_uuid,
      uri: uri,
    };
    return await this.callService(data);
  }
}
