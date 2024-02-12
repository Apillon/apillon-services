import {
  AssignCidToNft,
  AttachedServiceType,
  ComputingTransactionQueryFilter,
  ContractQueryFilter,
  CreateContractDto,
  DefaultApiKeyRole,
  EncryptContentDto,
  TransferOwnershipDto,
  ValidateFor,
} from '@apillon/lib';
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
    return await this.computingService.createContract(context, body);
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
    return await this.computingService.listContracts(context, query);
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
    return await this.computingService.getContract(context, uuid);
  }

  @Get('contracts/:uuid/transactions')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.COMPUTING,
  })
  @Validation({ dto: ContractQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listContractTransactions(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Query() query: ComputingTransactionQueryFilter,
  ) {
    query.contract_uuid = uuid;
    return await this.computingService.listTransactions(context, query);
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
    body.contract_uuid = uuid;
    return await this.computingService.transferContractOwnership(context, body);
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
    body.contract_uuid = uuid;
    return await this.computingService.encryptContent(context, body);
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
    body.contract_uuid = uuid;
    return await this.computingService.assignCidToNft(context, body);
  }
}
