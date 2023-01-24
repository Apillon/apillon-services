import { AttachedServiceType } from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { NftsService } from './nfts.service';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Get()
  async getHello(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.getHello(context);
  }

  @Post('/deploy')
  @Validation({ dto: DeployNftContractDto })
  @UseGuards(ValidationGuard)
  async deployNftContract(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: DeployNftContractDto,
  ) {
    return await this.nftsService.deployNftContract(context, body);
  }
}
