import {
  ApillonApiCallContractDTO,
  ApillonApiContractAbiQueryDTO,
  ApillonApiContractsQueryFilterDTO,
  ApillonApiContractTransactionQueryFilterDTO,
  ApillonApiCreateContractDTO,
  ApillonApiDeployedContractsQueryFilterDTO,
  AttachedServiceType,
  DefaultApiKeyRole,
  ValidateFor,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { ContractsService } from './contracts.service';
import { ApillonApiContext } from '../../context';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  //#region ------------- CONTRACT DEPLOY ------------

  @Get('deployed')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @Validation({
    dto: ApillonApiDeployedContractsQueryFilterDTO,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async listDeployedContracts(
    @Ctx() context: ApillonApiContext,
    @Query() query: ApillonApiDeployedContractsQueryFilterDTO,
  ) {
    return await this.contractsService.listDeployedContracts(context, query);
  }

  @Get('deployed/:uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @UseGuards(AuthGuard)
  async getDeployedContract(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.contractsService.getDeployedContract(context, uuid);
  }

  @Post('deployed/:uuid/call')
  @Validation({ dto: ApillonApiCallContractDTO })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async callDeployedContract(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Body() body: ApillonApiCallContractDTO,
  ) {
    body.contract_uuid = uuid;
    return await this.contractsService.callDeployedContract(context, body);
  }

  @Get('deployed/:uuid/abi')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @Validation({
    dto: ApillonApiContractAbiQueryDTO,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async getDeployedContractAbi(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Query() query: ApillonApiContractAbiQueryDTO,
  ) {
    query.contract_uuid = uuid;
    return await this.contractsService.getDeployedContractAbi(context, query);
  }

  @Delete('deployed/:uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @UseGuards(AuthGuard)
  async archiveDeployedContract(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') contract_deploy_uuid: string,
  ) {
    return await this.contractsService.archiveDeployedContract(
      context,
      contract_deploy_uuid,
    );
  }

  @Get('deployed/:uuid/transactions')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @Validation({
    dto: ApillonApiContractTransactionQueryFilterDTO,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async listContractTransactions(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Query() query: ApillonApiContractTransactionQueryFilterDTO,
  ) {
    query.contract_deploy_uuid = uuid;
    return await this.contractsService.listDeployedContractTransactions(
      context,
      query,
    );
  }

  //#endregion
  //#region ------------- CONTRACTS -------------

  @Get('')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @Validation({
    dto: ApillonApiContractsQueryFilterDTO,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async listContracts(
    @Ctx() context: ApillonApiContext,
    @Query() query: ApillonApiContractsQueryFilterDTO,
  ) {
    return await this.contractsService.listContracts(context, query);
  }

  @Get(':uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @UseGuards(AuthGuard)
  async getContract(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.contractsService.getContract(context, uuid);
  }

  @Get(':uuid/abi')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @UseGuards(AuthGuard)
  async getContractAbi(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Query() query: ApillonApiContractAbiQueryDTO,
  ) {
    query.contract_uuid = uuid;
    return await this.contractsService.getContractAbi(context, query);
  }

  @Post(':uuid/deploy')
  @Validation({ dto: ApillonApiCreateContractDTO })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.CONTRACTS,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async createContract(
    @Ctx() context: ApillonApiContext,
    @Param('uuid') uuid: string,
    @Body() body: ApillonApiCreateContractDTO,
  ) {
    body.contract_uuid = uuid;
    return await this.contractsService.deployContract(context, body);
  }

  //#endregion
}
