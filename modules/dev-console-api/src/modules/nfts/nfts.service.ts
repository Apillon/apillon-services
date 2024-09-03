import {
  AddNftsMetadataDto,
  AttachedServiceType,
  BurnNftDto,
  ChainType,
  CodeException,
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
} from '@apillon/blockchain-lib/common';
import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { ServicesService } from '../services/services.service';
import { Service } from '../services/models/service.model';
import { ServiceQueryFilter } from '../services/dtos/services-query-filter.dto';
import { ServiceDto } from '../services/dtos/service.dto';

@Injectable()
export class NftsService {
  constructor(private readonly serviceService: ServicesService) {}

  async createCollection(
    context: DevConsoleApiContext,
    chainType: ChainType,
    body: CreateCollectionDTO | CreateSubstrateCollectionDTO,
  ) {
    //check project
    const project: Project = await new Project({}, context).populateByUUID(
      body.project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canModify(context);

    // Check if NFT service for this project already exists
    const { total } = await new Service({}).getServices(
      context,
      new ServiceQueryFilter(
        {
          project_uuid: project.project_uuid,
          serviceType_id: AttachedServiceType.NFT,
        },
        context,
      ),
    );
    if (total == 0) {
      // Create NFT service - "Attach"
      const nftService = new ServiceDto(
        {
          project_uuid: project.project_uuid,
          name: 'NFTs service',
          serviceType_id: AttachedServiceType.NFT,
        },
        context,
      );
      await this.serviceService.createService(context, nftService);
    }

    return (
      await new NftsMicroservice(context).createCollection(
        new CreateCollectionDTO({ ...body.serialize(), chainType }),
      )
    ).data;
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
