import {
  Ams,
  AttachedServiceType,
  DefaultApiKeyRole,
  OauthListFilterDto,
  ValidateFor,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('discord-bot')
export class DiscordBotController {
  @Get('user-list')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.SYSTEM,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: OauthListFilterDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getDiscordUserList(
    @Ctx() context: ApillonApiContext,
    @Query() filter: OauthListFilterDto,
  ) {
    return await new Ams(context).getDiscordUserList(filter);
  }
}
