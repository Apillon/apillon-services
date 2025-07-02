import {
  AssignCidToNft,
  ComputingTransactionQueryFilter,
  ContractQueryFilter,
  CreateContractDto,
  DefaultPermission,
  DefaultUserRole,
  EncryptContentDto,
  HttpException,
  HttpStatus,
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

const SCHRODINGER_CONTRACT_DEPRECATED =
  'Schrodinger contract from computing module has been deprecated';

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
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }

  @Get('contracts')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: ContractQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listComputingContracts(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ContractQueryFilter,
  ) {
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }

  @Get('contracts/:uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getContract(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SCHRODINGER_CONTRACT_DEPRECATED, HttpStatus.GONE);
  }
}
