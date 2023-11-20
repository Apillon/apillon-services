import { DefaultUserRole, DepositToClusterDto } from '@apillon/lib';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
}
