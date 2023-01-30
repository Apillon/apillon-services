import { Ctx } from '@apillon/modules-lib';
import { Controller, Get } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { HostingService } from './hosting.service';

@Controller('hosting')
export class HostingController {
  constructor(private hostingService: HostingService) {}

  @Get('domains')
  async listDomains(@Ctx() context: ApillonApiContext) {
    return await this.hostingService.listDomains(context);
  }
}
