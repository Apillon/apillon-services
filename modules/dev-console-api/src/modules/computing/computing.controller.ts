import {
  ContractQueryFilter,
  CreateContractDto,
  DefaultPermission,
  DefaultUserRole,
  EncryptContentDto,
  RoleGroup,
  TransferOwnershipDto,
  ValidateFor,
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
import { ValidationGuard } from '../../guards/validation.guard';
import { ComputingService } from './computing.service';

@Controller('computing')
@Permissions({ permission: DefaultPermission.COMPUTING })
export class ComputingController {
  constructor(private readonly computingService: ComputingService) {}

  @Post('contracts')
  @Validation({ dto: CreateContractDto })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async createContract(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateContractDto,
  ) {
    return await this.computingService.createContract(context, body);
  }

  @Get('contracts')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: ContractQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
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

  @Post('contracts/:uuid/transfer-ownership')
  @Validation({ dto: TransferOwnershipDto })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
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
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async encryptContent(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
    @Body() body: EncryptContentDto,
  ) {
    body.contract_uuid = uuid;
    return await this.computingService.encryptContent(context, body);
  }
}
