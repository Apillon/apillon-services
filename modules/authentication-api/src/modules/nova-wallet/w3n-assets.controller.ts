/*
https://docs.nestjs.com/controllers#controllers
*/

import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { W3nAssetsDto } from './dtos/w3n-assets.dto';
import { ValidationGuard } from '../../guards/validation.guard';
import { AuthenticationApiContext } from '../../context';
import { W3nAssetsService } from './w3n-assets.service';
import { ShortUrlDto } from '@apillon/lib';

/**
 * Controller with endpoints, which will be called from website to manage wallets associated with web3 name.
 * Endpoints are public
 * Endpoints actually interact with Apillon API. For that, API key and secret must be set in environment(NOVA_WALLET_API_KEY,NOVA_WALLET_API_KEY_SECRET).
 */
@Controller('w3n-assets')
export class W3nAssetsController {
  constructor(private w3nAssetsService: W3nAssetsService) {}

  @Post()
  @Validation({ dto: W3nAssetsDto })
  @UseGuards(ValidationGuard)
  async uploadAssetsToIpfs(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: W3nAssetsDto,
  ) {
    return await this.w3nAssetsService.uploadAssetsToIpfs(context, body);
  }

  @Get(':uuid')
  async getFileDetails(
    @Ctx() context: AuthenticationApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.w3nAssetsService.getFileDetail(context, uuid);
  }

  @Post('short-url')
  async generateShortUrl(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: ShortUrlDto,
  ) {
    return await this.w3nAssetsService.generateShortUrl(
      context,
      body.targetUrl,
    );
  }
}
