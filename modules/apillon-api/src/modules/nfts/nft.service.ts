import {
  ApillonApiNFTCollectionQueryFilter,
  BurnNftDto,
  ChainType,
  isAllowedToCreateNftCollection,
  MintNftDTO,
  NestMintNftDTO,
  NftsMicroservice,
  TransactionQueryFilter,
  TransferCollectionDTO,
} from '@apillon/lib';
import {
  CreateCollectionDTO,
  CreateSubstrateCollectionDTO,
} from '@apillon/blockchain-lib/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class NftService {
  async createCollection(
    context: ApillonApiContext,
    chainType: ChainType,
    body: CreateCollectionDTO | CreateSubstrateCollectionDTO,
  ) {
    const dto = new CreateCollectionDTO().populate({
      ...body.serialize(),
      project_uuid: context.apiKey.project_uuid,
    });

    const isAllowed = await isAllowedToCreateNftCollection(
      context,
      chainType,
      body.chain,
      dto.project_uuid,
    );
    if (!isAllowed) {
      throw new UnauthorizedException(
        `This operation requires a Butterfly plan.`,
      );
    }

    return (await new NftsMicroservice(context).createCollection(dto)).data;
  }

  async listNftCollections(
    context: ApillonApiContext,
    query: ApillonApiNFTCollectionQueryFilter,
  ) {
    return (await new NftsMicroservice(context).listNftCollections(query)).data;
  }

  async getCollection(context: ApillonApiContext, uuid: string) {
    return (await new NftsMicroservice(context).getNftCollection(uuid)).data;
  }

  async listCollectionTransactions(
    context: ApillonApiContext,
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

  async mintNft(
    context: ApillonApiContext,
    collection_uuid: string,
    body: MintNftDTO,
  ) {
    const dto = new MintNftDTO().populate({
      ...body.serialize(),
      collection_uuid: collection_uuid,
    });

    return (await new NftsMicroservice(context).mintNft(dto)).data;
  }

  async nestMintNft(
    context: ApillonApiContext,
    collection_uuid: string,
    body: NestMintNftDTO,
  ) {
    const dto = new NestMintNftDTO().populate({
      ...body.serialize(),
      collection_uuid: collection_uuid,
    });

    return (await new NftsMicroservice(context).nestMintNft(dto)).data;
  }

  async transferCollectionOwnership(
    context: ApillonApiContext,
    collection_uuid: string,
    body: TransferCollectionDTO,
  ) {
    const dto = new TransferCollectionDTO().populate({
      ...body,
      collection_uuid,
    });

    return (
      await new NftsMicroservice(context).transferCollectionOwnership(dto)
    ).data;
  }

  async burnNft(
    context: ApillonApiContext,
    collection_uuid: string,
    body: BurnNftDto,
  ) {
    const dto = new BurnNftDto().populate({
      ...body.serialize(),
      collection_uuid,
    });

    return (await new NftsMicroservice(context).burnNftToken(dto)).data;
  }
}
