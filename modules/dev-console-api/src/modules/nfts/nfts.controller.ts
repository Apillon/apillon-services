import { ValidateFor } from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { MintNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/mint-nft-query-filter.dto';
import { TransferNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/transfer-nft-query-filter.dto';
import { SetNftBaseUriQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/set-nft-base-uri-query.dto';
import { Ctx, Validation } from '@apillon/modules-lib';
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
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { NftsService } from './nfts.service';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Get()
  async getHello(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.getHello(context);
  }

  @Post('/deploy')
  @Validation({ dto: DeployNftContractDto })
  @UseGuards(ValidationGuard)
  async deployNftContract(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: DeployNftContractDto,
  ) {
    return await this.nftsService.deployNftContract(context, body);
  }

  @Get(':collection_uuid/transferOwnership')
  @Validation({ dto: TransferNftQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async transferOwnership(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Query() query: TransferNftQueryFilter,
  ) {
    return await this.nftsService.transferNftOwnership(
      context,
      collection_uuid,
      query,
    );
  }

  @Get(':collection_uuid/mint')
  @Validation({ dto: MintNftQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async mintNft(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Query() query: MintNftQueryFilter,
  ) {
    return await this.nftsService.mintNftTo(context, collection_uuid, query);
  }

  @Get(':collection_uuid/setBaseUri')
  @Validation({ dto: SetNftBaseUriQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async setNftCollectionBaseUri(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Query() query: SetNftBaseUriQueryFilter,
  ) {
    return await this.nftsService.setNftCollectionBaseUri(
      context,
      collection_uuid,
      query,
    );
  }
}
