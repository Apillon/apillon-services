import {
  CallContractDTO,
  ContractAbiQueryDTO,
  DeployedContractsQueryFilter,
  CreateContractDTO,
  DefaultPermission,
  DefaultUserRole,
  RoleGroup,
  ValidateFor,
  ContractsQueryFilter,
  ContractTransactionQueryFilter,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
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
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { ContractsService } from './contracts.service';

@Controller('contracts')
@Permissions({ permission: DefaultPermission.CONTRACTS })
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  //#region ------------- CONTRACT DEPLOY ------------

  @Get('deployed')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: DeployedContractsQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listDeployedContracts(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: DeployedContractsQueryFilter,
  ) {
    return await this.contractsService.listDeployedContracts(context, query);
  }

  @Get('deployed/:uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getDeployedContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') contract_uuid: string,
  ) {
    return await this.contractsService.getDeployedContract(
      context,
      contract_uuid,
    );
  }

  @Post('deployed/:uuid/call')
  @Validation({ dto: CallContractDTO })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async callDeployedContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') contract_uuid: string,
    @Body() body: CallContractDTO,
  ) {
    body.contract_uuid = contract_uuid;
    return await this.contractsService.callDeployedContract(context, body);
  }

  @Get('deployed/:uuid/abi')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ContractAbiQueryDTO, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getDeployedContractAbi(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') contract_uuid: string,
    @Query() query: ContractAbiQueryDTO,
  ) {
    query.contract_uuid = contract_uuid;
    return await this.contractsService.getDeployedContractAbi(context, query);
  }

  @Delete('deployed/:uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async archiveDeployedContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') contract_uuid: string,
  ) {
    return await this.contractsService.archiveDeployedContract(
      context,
      contract_uuid,
    );
  }

  @Get('deployed/:uuid/transactions')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: ContractTransactionQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listDeployedContractTransactions(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') contract_uuid: string,
    @Query() query: ContractTransactionQueryFilter,
  ) {
    query.contract_deploy_uuid = contract_uuid;
    return await this.contractsService.listDeployedContractTransactions(
      context,
      query,
    );
  }

  //#endregion
  //#region ------------- CONTRACTS -------------

  @Post(':uuid/deploy')
  @Validation({ dto: CreateContractDTO })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async createContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') contract_uuid: string,
    @Body() body: CreateContractDTO,
  ) {
    body.contract_uuid = contract_uuid;
    return await this.contractsService.deployContract(context, body);
  }

  @Get('')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: ContractsQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listContracts(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ContractsQueryFilter,
  ) {
    return await this.contractsService.listContracts(context, query);
  }

  @Get(':uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async getContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') contract_uuid: string,
  ) {
    return await this.contractsService.getContract(context, contract_uuid);
  }

  @Get(':uuid/abi')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: ContractAbiQueryDTO, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getContractAbi(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') contract_uuid: string,
    @Query() query: ContractAbiQueryDTO,
  ) {
    query.contract_uuid = contract_uuid;
    return await this.contractsService.getContractAbi(context, query);
  }

  //#endregion
}
