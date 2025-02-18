import {
  AddNftsMetadataDto,
  AttachedServiceType,
  BurnNftDto,
  ChainType,
  CollectionMetadataQueryFilter,
  CollectionsQuotaReachedQueryFilter,
  DeployCollectionDTO,
  MintNftDTO,
  NestMintNftDTO,
  NFTCollectionQueryFilter,
  NftsMicroservice,
  SetCollectionBaseUriDTO,
  StorageMicroservice,
  TransactionQueryFilter,
  TransferCollectionDTO,
} from '@apillon/lib';
import {
  CreateCollectionDTO,
  CreateSubstrateCollectionDTO,
  CreateUniqueCollectionDTO,
} from '@apillon/blockchain-lib/common';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ServicesService } from '../services/services.service';

@Injectable()
export class NftsService {
  constructor(private readonly serviceService: ServicesService) {}

  async createCollection(
    context: DevConsoleApiContext,
    chainType: ChainType,
    body: CreateCollectionDTO | CreateSubstrateCollectionDTO,
  ) {
    await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.NFT,
    );

    return (
      await new NftsMicroservice(context).createCollection(
        new CreateCollectionDTO({ ...body.serialize(), chainType }),
      )
    ).data;
  }

  async createUniqueCollection(
    context: DevConsoleApiContext,
    body: CreateUniqueCollectionDTO,
  ) {
    await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.NFT,
    );

    return (await new NftsMicroservice(context).createUniqueCollection(body))
      .data;
  }

  async listNftCollections(
    context: DevConsoleApiContext,
    query: NFTCollectionQueryFilter,
  ) {
    return (await new NftsMicroservice(context).listNftCollections(query)).data;
  }

  async getNftCollection(context: DevConsoleApiContext, uuid: string) {
    return (await new NftsMicroservice(context).getNftCollection(uuid)).data;
  }

  async transferCollectionOwnership(
    context: DevConsoleApiContext,
    collection_uuid: string,
    body: TransferCollectionDTO,
  ) {
    body.collection_uuid = collection_uuid;
    return (
      await new NftsMicroservice(context).transferCollectionOwnership(body)
    ).data;
  }

  async mintNftTo(
    context: DevConsoleApiContext,
    collection_uuid: string,
    body: MintNftDTO,
  ) {
    body.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).mintNft(body)).data;
  }

  async nestMintNftTo(
    context: DevConsoleApiContext,
    collection_uuid: string,
    body: NestMintNftDTO,
  ) {
    body.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).nestMintNft(body)).data;
  }

  async setNftCollectionBaseUri(
    context: DevConsoleApiContext,
    collection_uuid: string,
    body: SetCollectionBaseUriDTO,
  ) {
    body.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).setNftCollectionBaseUri(body))
      .data;
  }

  async burnNftToken(
    context: DevConsoleApiContext,
    collection_uuid: string,
    body: BurnNftDto,
  ) {
    body.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).burnNftToken(body)).data;
  }

  async checkTransactionStatus(context: DevConsoleApiContext) {
    return (await new NftsMicroservice(context).checkTransactionStatus()).data;
  }

  async listCollectionTransactions(
    context: DevConsoleApiContext,
    collection_uuid: string,
    query: TransactionQueryFilter,
  ) {
    return (
      await new NftsMicroservice(context).listCollectionTransactions(
        collection_uuid,
        query,
      )
    ).data;
  }

  async deployCollection(
    context: DevConsoleApiContext,
    collection_uuid: string,
    body: DeployCollectionDTO,
  ) {
    body.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).deployCollection(body)).data;
  }

  async isCollectionsQuotaReached(
    context: DevConsoleApiContext,
    query: CollectionsQuotaReachedQueryFilter,
  ) {
    return (
      await new NftsMicroservice(context).maxCollectionsQuotaReached(query)
    ).data.maxCollectionsQuotaReached;
  }

  async addNftsMetadata(
    context: DevConsoleApiContext,
    collection_uuid: string,
    body: AddNftsMetadataDto,
  ) {
    body.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).addNftsMetadata(body)).data;
  }

  async addIpnsToCollection(
    context: DevConsoleApiContext,
    collection_uuid: string,
  ) {
    return (
      await new NftsMicroservice(context).addIpnsToCollection(collection_uuid)
    ).data;
  }

  async listCollectionMetadata(
    context: DevConsoleApiContext,
    collection_uuid: string,
    query: CollectionMetadataQueryFilter,
  ) {
    query.collection_uuid = collection_uuid;
    return (
      await new StorageMicroservice(context).listCollectionMetadata(query)
    ).data;
  }

  async archiveCollection(
    context: DevConsoleApiContext,
    collection_uuid: string,
  ) {
    return (
      await new NftsMicroservice(context).archiveCollection(collection_uuid)
    ).data;
  }

  async activateCollection(
    context: DevConsoleApiContext,
    collection_uuid: string,
  ) {
    return (
      await new NftsMicroservice(context).activateCollection(collection_uuid)
    ).data;
  }
}
