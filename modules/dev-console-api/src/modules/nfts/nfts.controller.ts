import {
  DefaultUserRole,
  DeployNftContractDto,
  MintNftDTO,
  NFTCollectionQueryFilter,
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

  @Post('/collections/:collection_uuid/transferOwnership')
  @Validation({ dto: TransferCollectionDTO })
  @UseGuards(ValidationGuard)
  async transferOwnership(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Body() body: TransferCollectionDTO,
  ) {
    return await this.nftsService.transferCollectionOwnership(
      context,
      collection_uuid,
      body,
    );
  }

  @Get('collections/:collection_uuid/mint')
  @Validation({ dto: MintNftDTO })
  @UseGuards(ValidationGuard)
  async mintNft(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Body() body: MintNftDTO,
  ) {
    return await this.nftsService.mintNftTo(context, collection_uuid, body);
  }

  @Post('collections/:collection_uuid/setBaseUri')
  @Validation({ dto: SetCollectionBaseUriDTO })
  @UseGuards(ValidationGuard)
  async setNftCollectionBaseUri(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Body() body: SetCollectionBaseUriDTO,
  ) {
    return await this.nftsService.setNftCollectionBaseUri(
      context,
      collection_uuid,
      body,
    );
  }

  @Post('/check-transactions-status')
  @UseGuards(DevEnvGuard)
  async checkTransactionStatus(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.checkTransactionStatus(context);
  }

  @Get('/collections/:collection_uuid/transactions')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: TransactionQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listCollectionTransactions(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Query() query: TransactionQueryFilter,
  ) {
    return await this.nftsService.listCollectionTransactions(
      context,
      collection_uuid,
      query,
    );
  }
}
