import {
  ClusterWalletQueryFilter,
  DefaultUserRole,
  DepositToClusterDto,
  ValidateFor,
} from '@apillon/lib';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { DevConsoleApiContext } from '../../../context';
import { ComputingService } from './computing.service';
import { ValidationGuard } from '../../../guards/validation.guard';

@Controller('admin-panel/computing')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class ComputingController {
  constructor(private readonly computingService: ComputingService) {}

  @Post('phala/deposit-to-cluster')
  @Validation({ dto: DepositToClusterDto })
  @UseGuards(ValidationGuard)
  async depositToPhalaCluster(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: DepositToClusterDto,
  ) {
    return await this.computingService.depositToPhalaCluster(context, body);
  }

  @Get('phala/wallets/:walletAddress/clusters')
  @Permissions({ role: DefaultUserRole.ADMIN })
  @Validation({ dto: ClusterWalletQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async listClusterWallets(
    @Ctx() context: DevConsoleApiContext,
    @Param('walletAddress') walletAddress: string,
    @Query() query: ClusterWalletQueryFilter,
  ) {
    query.walletAddress = walletAddress;
    return await this.computingService.listClusterWallets(context, query);
  }
}
