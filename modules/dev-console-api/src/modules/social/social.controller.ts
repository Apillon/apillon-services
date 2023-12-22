import {
  CreateSpaceDto,
  DefaultPermission,
  DefaultUserRole,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { SocialService } from './social.service';

@Controller('social')
@Permissions({ permission: DefaultPermission.SOCIAL })
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('space')
  @Validation({ dto: CreateSpaceDto })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async createSpace(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateSpaceDto,
  ) {
    return await this.socialService.createSpace(context, body);
  }
}
