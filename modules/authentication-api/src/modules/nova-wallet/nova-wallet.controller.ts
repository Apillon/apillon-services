/*
https://docs.nestjs.com/controllers#controllers
*/

import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UploadWalletsToIpfsDto } from './dtos/upload-wallets-to-ipfs.dto';
import { ValidationGuard } from '../../guards/validation.guard';
import { AuthenticationApiContext } from '../../context';
import { NovaWalletService } from './nova-wallet.service';

/**
 * Controller with endpoints, which will be called from website to manage wallets associated with web3 name.
 * Endpoints are public
 * Endpoints actually interact with Apillon API. For that, API key and secret must be set in environment(NOVA_WALLET_API_KEY,NOVA_WALLET_API_KEY_SECRET).
 */
@Controller('wallets')
export class NovaWalletController {
  constructor(private novaWalletService: NovaWalletService) {}

  @Post()
  @Validation({ dto: UploadWalletsToIpfsDto })
  @UseGuards(ValidationGuard)
  async uploadWalletsToIpfs(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: UploadWalletsToIpfsDto,
  ) {
    return await this.novaWalletService.uploadWalletsToIpfs(context, body);
  }

  @Get(':uuid')
  async getFileDetails(
    @Ctx() context: AuthenticationApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.novaWalletService.getFileDetail(context, uuid);
  }
}
