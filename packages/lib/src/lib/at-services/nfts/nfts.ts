import { env } from '../../../config/env';
import { AppEnvironment, NftsEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { NFTCollectionQueryFilter } from './dtos/collection-query-filter.dto';
import { CreateCollectionDTO } from './dtos/create-collection.dto';
import { MintNftDTO } from './dtos/mint-nft.dto';
import { DeployCollectionDTO } from './dtos/deploy-collection.dto';
import { SetCollectionBaseUriDTO } from './dtos/set-collection-base-uri.dto';
import { TransactionQueryFilter } from './dtos/transaction-query-filter.dto';
import { TransferCollectionDTO } from './dtos/transfer-collection.dto';
import { BurnNftDto } from './dtos/burn-nft.dto';
import { CollectionsQuotaReachedQueryFilter } from './dtos/collections-quota-reached-query-filter.dto';

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

  public async createCollection(params: CreateCollectionDTO) {
    const data = {
      eventName: NftsEventType.CREATE_COLLECTION,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async listNftCollections(params: NFTCollectionQueryFilter) {
    const data = {
      eventName: NftsEventType.NFT_COLLECTIONS_LIST,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getNftCollection(id: number) {
    const data = {
      eventName: NftsEventType.GET_NFT_COLLECTION,
      id: id,
    };
    return await this.callService(data);
  }

  public async transferCollectionOwnership(params: TransferCollectionDTO) {
    const data = {
      eventName: NftsEventType.TRANSFER_OWNERSHIP,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async mintNft(params: MintNftDTO) {
    const data = {
      eventName: NftsEventType.MINT_NFT,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async setNftCollectionBaseUri(params: SetCollectionBaseUriDTO) {
    const data = {
      eventName: NftsEventType.SET_BASE_URI,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async burnNftToken(params: BurnNftDto) {
    const data = {
      eventName: NftsEventType.BURN_NFT,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async checkTransactionStatus() {
    const data = {
      eventName: NftsEventType.CHECK_TRANSACTION_STATUS,
    };
    return await this.callService(data);
  }

  public async listCollectionTransactions(
    collection_uuid: string,
    params: TransactionQueryFilter,
  ) {
    const data = {
      eventName: NftsEventType.NFT_COLLECTION_TRANSACTION_LIST,
      collection_uuid: collection_uuid,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async deployCollection(params: DeployCollectionDTO) {
    const data = {
      eventName: NftsEventType.DEPLOY_COLLECTION,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async maxCollectionsQuotaReached(
    params: CollectionsQuotaReachedQueryFilter,
  ) {
    const data = {
      eventName: NftsEventType.MAX_COLLECTIONS_QUOTA_REACHED,
      query: params.serialize(),
    };
    return await this.callService(data);
  }
}
