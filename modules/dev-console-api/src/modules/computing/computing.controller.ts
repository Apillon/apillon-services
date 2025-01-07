import {
  AssignCidToNft,
  ComputingTransactionQueryFilter,
  ContractQueryFilter,
  CreateContractDto,
  DefaultPermission,
  DefaultUserRole,
  EncryptContentDto,
  RoleGroup,
  ValidateFor,
} from '@apillon/lib';
import { TransferOwnershipDto } from '@apillon/blockchain-lib/common';
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
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { ComputingService } from './computing.service';
import { ProjectModifyGuard } from '../../guards/project-modify.guard';

@Controller('computing')
@Permissions({ permission: DefaultPermission.COMPUTING })
export class ComputingController {
  constructor(private readonly computingService: ComputingService) {}

  @Post('contracts')
  @Validation({ dto: CreateContractDto })
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ValidationGuard, ProjectModifyGuard)
  async createContract(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateContractDto,
  ) {
    return await this.computingService.createContract(context, body);
  }

  @Get('contracts')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: ContractQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listComputingContracts(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ContractQueryFilter,
  ) {
    return await this.computingService.listContracts(context, query);
  }

  @Get('contracts/:uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.computingService.getContract(context, uuid);
  }

  @Delete('contracts/:uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async archiveContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.computingService.archiveContract(context, uuid);
  }

  @Patch('contracts/:uuid/activate')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async activateContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.computingService.activateContract(context, uuid);
  }

  @Get('contracts/:uuid/transactions')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: ComputingTransactionQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async listContractTransactions(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Query() query: ComputingTransactionQueryFilter,
  ) {
    query.contract_uuid = uuid;
    return await this.computingService.listTransactions(context, query);
  }

  @Post('contracts/:uuid/transfer-ownership')
  @Validation({ dto: TransferOwnershipDto })
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ValidationGuard)
  async transferOwnership(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Body() body: TransferOwnershipDto,
  ) {
    body.contract_uuid = uuid;
    return await this.computingService.transferContractOwnership(context, body);
  }

  @Post('contracts/:uuid/encrypt')
  @Validation({ dto: EncryptContentDto })
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard, ValidationGuard)
  async encryptContent(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Body() body: EncryptContentDto,
  ) {
    body.contract_uuid = uuid;
    return await this.computingService.encryptContent(context, body);
  }

  @Post('contracts/:uuid/assign-cid-to-nft')
  @Validation({ dto: AssignCidToNft })
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard, ValidationGuard)
  async assignCidToNft(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Body() body: AssignCidToNft,
  ) {
    body.contract_uuid = uuid;
    return await this.computingService.assignCidToNft(context, body);
  }
}
