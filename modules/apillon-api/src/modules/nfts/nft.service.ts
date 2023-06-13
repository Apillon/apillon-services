import {
  ApillonApiCreateCollectionDTO,
  BurnNftDto,
  CreateCollectionDTO,
  MintNftDTO,
  NftsMicroservice,
  TransactionQueryFilter,
  TransferCollectionDTO,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

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

    return (await new NftsMicroservice(context).createCollection(dto)).data;
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
    bucket_uuid: string,
    session_uuid: string,
    body: MintNftDTO,
  ) {
    return (await new NftsMicroservice(context).mintNft(body)).data;
  }

  async transferCollectionOwnership(
    context: ApillonApiContext,
    collection_uuid: string,
    body: TransferCollectionDTO,
  ) {
    body.collection_uuid = collection_uuid;
    return (
      await new NftsMicroservice(context).transferCollectionOwnership(body)
    ).data;
  }

  async burnNftToken(
    context: ApillonApiContext,
    collection_uuid: string,
    body: BurnNftDto,
  ) {
    body.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).burnNftToken(body)).data;
  }
}
