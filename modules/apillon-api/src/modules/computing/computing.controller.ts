import {
  AssignCidToNft,
  AttachedServiceType,
  ComputingTransactionQueryFilter,
  ContractQueryFilter,
  CreateContractDto,
  DefaultApiKeyRole,
  EncryptContentDto,
  HttpException,
  HttpStatus,
  ValidateFor,
} from '@apillon/lib';
import { TransferOwnershipDto } from '@apillon/blockchain-lib/common';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { ComputingService } from './computing.service';
import { ApillonApiContext } from '../../context';

const SCHRODINGER_CONTRACT_DEPRECATED =
  'Schrodinger contract from computing module has been deprecated';

@Controller('computing')
export class ComputingController {
  constructor(private readonly computingService: ComputingService) {}

  @Post('contracts')
  @Validation({ dto: CreateContractDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async createContract(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateContractDto,
  ) {
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }

  @Get('contracts')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @Validation({ dto: ContractQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listComputingContracts(
    @Ctx() context: ApillonApiContext,
    @Query() query: ContractQueryFilter,
  ) {
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }

  @Get('contracts/:uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard)
  async getContract(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
  ) {
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }

  @Get('contracts/:uuid/transactions')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @Validation({
    dto: ComputingTransactionQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async listContractTransactions(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Query() query: ComputingTransactionQueryFilter,
  ) {
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }

  @Post('contracts/:uuid/transfer-ownership')
  @Validation({ dto: TransferOwnershipDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async transferOwnership(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Body() body: TransferOwnershipDto,
  ) {
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }

  @Post('contracts/:uuid/encrypt')
  @Validation({ dto: EncryptContentDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async encryptContent(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Body() body: EncryptContentDto,
  ) {
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }

  @Post('contracts/:uuid/assign-cid-to-nft')
  @Validation({ dto: AssignCidToNft })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async assignCidToNft(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Body() body: AssignCidToNft,
  ) {
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }
}
