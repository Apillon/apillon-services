import {
  CodeException,
  NFTCollectionQueryFilter,
  NftsMicroservice,
  TransactionQueryFilter,
} from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { TransferNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/transfer-nft-query-filter.dto';
import { MintNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/mint-nft-query-filter.dto';
import { SetNftBaseUriQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/set-nft-base-uri-query.dto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { ResourceNotFoundErrorCode } from '../../config/types';

@Injectable()
export class NftsService {
  async getHello(context: DevConsoleApiContext) {
    return (await new NftsMicroservice(context).getHello()).data;
  }

  async deployNftContract(
    context: DevConsoleApiContext,
    body: DeployNftContractDto,
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

    return (await new NftsMicroservice(context).deployNftContract(body)).data;
  }

  async listNftCollections(
    context: DevConsoleApiContext,
    query: NFTCollectionQueryFilter,
  ) {
    return (await new NftsMicroservice(context).listNftCollections(query)).data;
  }

  async transferNftOwnership(
    context: DevConsoleApiContext,
    collection_uuid: string,
    query: TransferNftQueryFilter,
  ) {
    query.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).transferNftOwnership(query))
      .data;
  }

  async mintNftTo(
    context: DevConsoleApiContext,
    collection_uuid: string,
    query: MintNftQueryFilter,
  ) {
    query.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).mintNft(query)).data;
  }

  async setNftCollectionBaseUri(
    context: DevConsoleApiContext,
    collection_uuid: string,
    query: SetNftBaseUriQueryFilter,
  ) {
    query.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).setNftCollectionBaseUri(query))
      .data;
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
}
