import {
  DefaultUserRole,
  DeployNftContractDto,
  NFTCollectionQueryFilter,
  ValidateFor,
} from '@apillon/lib';
import { MintNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/mint-nft-query-filter.dto';
import { TransferNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/transfer-nft-query-filter.dto';
import { SetNftBaseUriQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/set-nft-base-uri-query.dto';
import { Ctx, Validation, Permissions } from '@apillon/modules-lib';
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
import { DevEnvGuard } from '../../guards/dev-env.guard';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Get()
  async getHello(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.getHello(context);
  }

  @Post('/collection')
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

  @Post('/check-transactions-status')
  @UseGuards(DevEnvGuard)
  async checkTransactionStatus(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.checkTransactionStatus(context);
  }
}
