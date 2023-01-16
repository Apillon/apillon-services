import { Ctx } from '@apillon/modules-lib';
import { Controller, Get } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { NftsService } from './nfts.service';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Get()
  async getHello(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.getHello(context);
  }
}
