import { env } from '../../../config/env';
import { AppEnvironment, NftsEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { DeployNftContractDto } from './dtos/deploy-nft-contract.dto';
import { MintNftQueryFilter } from './dtos/mint-nft-query-filter.dto';
import { SetNftBaseUriQueryFilter } from './dtos/set-nft-base-uri-query.dto';
import { TransferNftQueryFilter } from './dtos/transfer-nft-query-filter.dto';

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

  public async transferNftOwnership(params: TransferNftQueryFilter) {
    const data = {
      eventName: NftsEventType.TRANSFER_OWNERSHIP,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async mintNft(params: MintNftQueryFilter) {
    const data = {
      eventName: NftsEventType.MINT_NFT,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async setNftCollectionBaseUri(params: SetNftBaseUriQueryFilter) {
    const data = {
      eventName: NftsEventType.SET_BASE_URI,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async checkTransactionStatus() {
    const data = {
      eventName: NftsEventType.CHECK_TRANSACTION_STATUS,
    };
    return await this.callService(data);
  }
}
