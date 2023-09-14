import {
  CreateCollectionDTO,
  DefaultUserRole,
  MintNftDTO,
  NestMintNftDTO,
  NFTCollectionQueryFilter,
  DeployCollectionDTO,
  SetCollectionBaseUriDTO,
  TransactionQueryFilter,
  TransferCollectionDTO,
  ValidateFor,
  BurnNftDto,
  CollectionsQuotaReachedQueryFilter,
  DefaultPermission,
  RoleGroup,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { DevEnvGuard } from '../../guards/dev-env.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { NftsService } from './nfts.service';

@Controller('nfts')
@Permissions({ permission: DefaultPermission.NFTS })
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Post('collections')
  @Validation({ dto: CreateCollectionDTO })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async createCollection(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateCollectionDTO,
  ) {
    return await this.nftsService.createCollection(context, body);
  }

  @Get('collections')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: NFTCollectionQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listNftCollections(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: NFTCollectionQueryFilter,
  ) {
    return await this.nftsService.listNftCollections(context, query);
  }

  @Get('collections/quota-reached')
  @Permissions({ role: DefaultUserRole.USER })
  @Validation({
    dto: CollectionsQuotaReachedQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async isCollectionsQuotaReached(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: CollectionsQuotaReachedQueryFilter,
  ) {
    return await this.nftsService.isCollectionsQuotaReached(context, query);
  }

  @Get('collections/:uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getCollection(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.nftsService.getNftCollection(context, uuid);
  }

  @Post('collections/:collectionUuid/transferOwnership')
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

  @Post('collections/:collectionUuid/mint')
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

  @Post('/collections/:collectionUuid/nest-mint')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: NestMintNftDTO })
  @UseGuards(ValidationGuard, AuthGuard)
  async nestMintNft(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Body() body: NestMintNftDTO,
  ) {
    return await this.nftsService.nestMintNftTo(context, collectionUuid, body);
  }

  @Post('collections/:collectionUuid/set-base-uri')
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

  @Post('check-transactions-status')
  @UseGuards(DevEnvGuard)
  async checkTransactionStatus(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.checkTransactionStatus(context);
  }

  @Get('collections/:collectionUuid/transactions')
  @Permissions({ role: RoleGroup.ProjectAccess })
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

  @Post('collections/:collectionUuid/burn')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: BurnNftDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async burnNftToken(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Body() body: BurnNftDto,
  ) {
    return await this.nftsService.burnNftToken(context, collectionUuid, body);
  }

  @Post('collections/:collectionUuid/deploy')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: DeployCollectionDTO })
  @UseGuards(ValidationGuard, AuthGuard)
  async deployCollection(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Body() body: DeployCollectionDTO,
  ) {
    return await this.nftsService.deployCollection(
      context,
      collectionUuid,
      body,
    );
  }
}
