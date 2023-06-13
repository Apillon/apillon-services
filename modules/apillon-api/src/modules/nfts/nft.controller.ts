import {
  ApillonApiCreateCollectionDTO,
  AttachedServiceType,
  DefaultApiKeyRole,
  TransactionQueryFilter,
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
    @Body()
    body: ApillonApiCreateCollectionDTO,
  ) {
    return await this.nftService.createCollection(context, body);
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
}
