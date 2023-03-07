import {
  DefaultUserRole,
  DeployNftContractDto,
  MintNftDTO,
  NFTCollectionQueryFilter,
  PrepareCollectionMetadataDTO,
  SetCollectionBaseUriDTO,
  TransactionQueryFilter,
  TransferCollectionDTO,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Validation, Permissions } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { NftsService } from './nfts.service';
import { DevEnvGuard } from '../../guards/dev-env.guard';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Get()
  async getHello(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.getHello(context);
  }

  @Post('/collections')
  @Validation({ dto: DeployNftContractDto })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deployNftContract(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: DeployNftContractDto,
  ) {
    return await this.nftsService.deployNftContract(context, body);
  }

  @Get('/collections')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: NFTCollectionQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listNftCollections(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: NFTCollectionQueryFilter,
  ) {
    return await this.nftsService.listNftCollections(context, query);
  }

  @Get('/collections/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async getCollection(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.nftsService.getNftCollection(context, id);
  }

  @Post('/collections/:collectionUuid/transferOwnership')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: TransferCollectionDTO })
  @UseGuards(ValidationGuard, AuthGuard)
  async transferOwnership(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Body() body: TransferCollectionDTO,
  ) {
    return await this.nftsService.transferCollectionOwnership(
      context,
      collectionUuid,
      body,
    );
  }

  @Post('/collections/:collectionUuid/mint')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: MintNftDTO })
  @UseGuards(ValidationGuard, AuthGuard)
  async mintNft(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Body() body: MintNftDTO,
  ) {
    return await this.nftsService.mintNftTo(context, collectionUuid, body);
  }

  @Post('/collections/:collectionUuid/set-base-uri')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: SetCollectionBaseUriDTO })
  @UseGuards(ValidationGuard, AuthGuard)
  async setNftCollectionBaseUri(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Body() body: SetCollectionBaseUriDTO,
  ) {
    return await this.nftsService.setNftCollectionBaseUri(
      context,
      collectionUuid,
      body,
    );
  }

  @Post('/check-transactions-status')
  @UseGuards(DevEnvGuard)
  async checkTransactionStatus(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.checkTransactionStatus(context);
  }

  @Get('/collections/:collectionUuid/transactions')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: TransactionQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listCollectionTransactions(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Query() query: TransactionQueryFilter,
  ) {
    return await this.nftsService.listCollectionTransactions(
      context,
      collectionUuid,
      query,
    );
  }

  @Post('/collections/:collectionUuid/prepare-metadata')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: PrepareCollectionMetadataDTO })
  @UseGuards(ValidationGuard, AuthGuard)
  async prepareMetadata(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Body() body: PrepareCollectionMetadataDTO,
  ) {
    return await this.nftsService.prepareCollectionMetadata(
      context,
      collectionUuid,
      body,
    );
  }
}
