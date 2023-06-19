import {
  ApillonApiCreateCollectionDTO,
  ApillonApiNFTCollectionQueryFilter,
  AttachedServiceType,
  BurnNftDto,
  DefaultApiKeyRole,
  MintNftDTO,
  TransactionQueryFilter,
  TransferCollectionDTO,
  ValidateFor,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { NftService } from './nft.service';

@Controller('nfts')
export class NftController {
  constructor(private nftService: NftService) {}

  @Post('collections')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.NFT,
  })
  @Validation({ dto: ApillonApiCreateCollectionDTO })
  @UseGuards(AuthGuard, ValidationGuard)
  async createCollection(
    @Ctx() context: ApillonApiContext,
    @Body() body: ApillonApiCreateCollectionDTO,
  ) {
    return await this.nftService.createCollection(context, body);
  }

  @Get('collections')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.NFT,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  @HttpCode(200)
  @Validation({
    dto: ApillonApiNFTCollectionQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  async listNftCollections(
    @Ctx() context: ApillonApiContext,
    @Query() query: ApillonApiNFTCollectionQueryFilter,
  ) {
    query.project_uuid = context.apiKey.project_uuid;

    return await this.nftService.listNftCollections(context, query);
  }

  @Get('collections/:uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.NFT,
  })
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async getCollection(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.nftService.getCollection(context, uuid);
  }

  @Get('collections/:uuid/transactions')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.NFT,
  })
  @Validation({
    dto: TransactionQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async listCollectionTransactions(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Query() query: TransactionQueryFilter,
  ) {
    return await this.nftService.listCollectionTransactions(
      context,
      uuid,
      query,
    );
  }

  @Post('collections/:uuid/transfer')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.NFT,
  })
  @Validation({ dto: TransferCollectionDTO })
  @UseGuards(AuthGuard, ValidationGuard)
  async transferCollectionOwnership(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Body() body: TransferCollectionDTO,
  ) {
    return await this.nftService.transferCollectionOwnership(
      context,
      uuid,
      body,
    );
  }

  @Post('collections/:uuid/mint')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.NFT,
  })
  @Validation({ dto: MintNftDTO })
  @UseGuards(AuthGuard, ValidationGuard)
  async mintCollectionNft(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Body() body: MintNftDTO,
  ) {
    return await this.nftService.mintNft(context, uuid, body);
  }

  @Post('collections/:uuid/burn')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.NFT,
  })
  @Validation({ dto: BurnNftDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async burnCollectionNft(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Body() body: BurnNftDto,
  ) {
    return await this.nftService.burnNft(context, uuid, body);
  }
}
