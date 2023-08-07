import {
  ApillonApiCreateCollectionDTO,
  ApillonApiNFTCollectionQueryFilter,
  BurnNftDto,
  CreateCollectionDTO,
  MintNftDTO,
  NestMintNftDTO,
  NftsMicroservice,
  TransactionQueryFilter,
  TransferCollectionDTO,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

function sanitizeCollection(collection: any) {
  delete collection.imagesSession;
  delete collection.metadataSession;

  return collection;
}

@Injectable()
export class NftService {
  async createCollection(
    context: ApillonApiContext,
    body: ApillonApiCreateCollectionDTO,
  ) {
    const dto = new CreateCollectionDTO().populate({
      ...body.serialize(),
      project_uuid: context.apiKey.project_uuid,
    });

    const collection = (
      await new NftsMicroservice(context).createCollection(dto)
    ).data;

    return sanitizeCollection(collection);
  }

  async listNftCollections(
    context: ApillonApiContext,
    query: ApillonApiNFTCollectionQueryFilter,
  ) {
    const collections = (
      await new NftsMicroservice(context).listNftCollections(query)
    ).data;

    return {
      ...collections,
      items: collections.items.map(sanitizeCollection),
    };
  }

  async getCollection(context: ApillonApiContext, uuid: string) {
    const collection = (
      await new NftsMicroservice(context).getNftCollection(uuid)
    ).data;

    return sanitizeCollection(collection);
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

    const collection = (
      await new NftsMicroservice(context).transferCollectionOwnership(dto)
    ).data;

    return sanitizeCollection(collection);
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
