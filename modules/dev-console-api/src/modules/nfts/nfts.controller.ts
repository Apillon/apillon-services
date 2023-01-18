import { AttachedServiceType } from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { Ctx } from '@apillon/modules-lib';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { NftsService } from './nfts.service';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Get()
  async getHello(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.getHello(context);
  }

  // @Post('/deploy')
  // async deployNftContract(
  //   @Ctx() context: DevConsoleApiContext,
  //   @Body() body: DeployNftContractDto,
  // ) {
  //   return await this.nftsService.deployNftContract(context, body);
  // }
}
