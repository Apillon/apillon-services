import {
  AttachedServiceType,
  DefaultApiKeyRole,
  DeployWebPageDto,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { HostingService } from './hosting.service';

@Controller('hosting')
export class HostingController {
  constructor(private hostingService: HostingService) {}

  @Get('domains')
  async listDomains(@Ctx() context: ApillonApiContext) {
    return await this.hostingService.listDomains(context);
  }

  @Get('web-pages/:id')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getWebPage(@Ctx() context: ApillonApiContext, @Param('id') id: any) {
    return await this.hostingService.getWebPage(context, id);
  }

  @Post('web-pages/:id/deploy')
  @HttpCode(200)
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: DeployWebPageDto, skipValidation: true })
  @UseGuards(ValidationGuard)
  async deployWebPage(
    @Ctx() context: ApillonApiContext,
    @Param('id') id: any,
    @Body() body: DeployWebPageDto,
  ) {
    return await this.hostingService.deployWebPage(context, id, body);
  }

  @Get('web-pages/:webPage_id/deployments/:id')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getDeployment(
    @Ctx() context: ApillonApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.hostingService.getDeployment(context, id);
  }
}
