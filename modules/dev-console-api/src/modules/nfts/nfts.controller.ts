import {
  AddNftsMetadataDto,
  BurnNftDto,
  ChainType,
  CollectionMetadataQueryFilter,
  CollectionsQuotaReachedQueryFilter,
  DefaultPermission,
  DefaultUserRole,
  DeployCollectionDTO,
  MintNftDTO,
  NestMintNftDTO,
  NFTCollectionQueryFilter,
  RoleGroup,
  SetCollectionBaseUriDTO,
  TransactionQueryFilter,
  TransferCollectionDTO,
  ValidateFor,
  ValidationException,
  ValidatorErrorCode,
} from '@apillon/lib';
import {
  CreateCollectionDTO,
  CreateSubstrateCollectionDTO,
  CreateUniqueCollectionBodyDTO,
  CreateUniqueCollectionDTO,
} from '@apillon/blockchain-lib/common';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { DevEnvGuard } from '../../guards/dev-env.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { NftsService } from './nfts.service';
import { ProjectModifyGuard } from '../../guards/project-modify.guard';

@Controller('nfts')
@Permissions({ permission: DefaultPermission.NFTS })
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Post(['collections', 'collections/evm'])
  @Validation({ dto: CreateCollectionDTO })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ProjectModifyGuard)
  async createCollection(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateCollectionDTO,
  ) {
    return await this.nftsService.createCollection(
      context,
      ChainType.EVM,
      body,
    );
  }

  @Post('collections/substrate')
  @Validation({ dto: CreateSubstrateCollectionDTO })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ProjectModifyGuard)
  async createSubstrateCollection(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateSubstrateCollectionDTO,
  ) {
    return await this.nftsService.createCollection(
      context,
      ChainType.SUBSTRATE,
      body,
    );
  }

  @Post('collections/unique')
  @Validation({ dto: CreateUniqueCollectionBodyDTO })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ProjectModifyGuard)
  async createUniqueCollection(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateUniqueCollectionBodyDTO,
    @Req() req: any,
  ) {
    // multer is executed in global middleware for this endpoint, meaning
    // multi-part form data is converted to body and files keys of request
    // automatically (no need for file interceptor here)
    const file = req.files.find((f) => f.fieldname === 'metadata');
    if (!file) {
      throw new ValidationException({
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
        property: 'metadata',
        message: 'Metadata file not present.',
      });
    }
    const maxFileSizeBytes = 10485760; // 10MB
    if (file.size > maxFileSizeBytes) {
      throw new ValidationException({
        code: ValidatorErrorCode.DATA_NOT_VALID,
        property: 'metadata',
        message: `File is too large. Maximal size is ${maxFileSizeBytes} bytes (current size is ${file.size} bytes).`,
      });
    }
    try {
      body.metadata = JSON.parse(file.buffer.toString('utf-8'));
    } catch (error) {
      throw new ValidationException({
        code: ValidatorErrorCode.DATA_NOT_VALID,
        property: 'metadata',
        message: 'Failed to parse metadata JSON: ' + error.message,
      });
    }
    const dto = new CreateUniqueCollectionDTO(body);
    await dto.validate();

    return await this.nftsService.createUniqueCollection(context, dto);
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

  @Post('collections/:collectionUuid/nfts-metadata')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: AddNftsMetadataDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async addNftsMetadata(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Body() body: AddNftsMetadataDto,
  ) {
    return await this.nftsService.addNftsMetadata(
      context,
      collectionUuid,
      body,
    );
  }

  @Post('collections/:collectionUuid/ipns')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async addIpnsToCollection(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
  ) {
    return await this.nftsService.addIpnsToCollection(context, collectionUuid);
  }

  @Get('collections/:collectionUuid/nfts-metadata')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: CollectionMetadataQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listCollectionMetadata(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
    @Query() query: CollectionMetadataQueryFilter,
  ) {
    return await this.nftsService.listCollectionMetadata(
      context,
      collectionUuid,
      query,
    );
  }

  @Delete('collections/:collectionUuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async archiveCollection(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
  ) {
    return await this.nftsService.archiveCollection(context, collectionUuid);
  }

  @Patch('collections/:collectionUuid/activate')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async activateCollection(
    @Ctx() context: DevConsoleApiContext,
    @Param('collectionUuid') collectionUuid: string,
  ) {
    return await this.nftsService.activateCollection(context, collectionUuid);
  }
}
