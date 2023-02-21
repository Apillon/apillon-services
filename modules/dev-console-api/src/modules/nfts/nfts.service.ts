import {
  CodeException,
  MintNftDTO,
  NFTCollectionQueryFilter,
  NftsMicroservice,
  SetCollectionBaseUriDTO,
  TransactionQueryFilter,
  TransferCollectionDTO,
} from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
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

  async setNftCollectionBaseUri(
    context: DevConsoleApiContext,
    collection_uuid: string,
    body: SetCollectionBaseUriDTO,
  ) {
    body.collection_uuid = collection_uuid;
    return (await new NftsMicroservice(context).setNftCollectionBaseUri(body))
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
