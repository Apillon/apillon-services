import {
  CreateWebPageDto,
  DefaultUserRole,
  DeployWebPageDto,
  ValidateFor,
  WebPageQueryFilter,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { AuthGuard } from '../../../guards/auth.guard';
import { ValidationGuard } from '../../../guards/validation.guard';
import { HostingService } from './hosting.service';

@Controller('storage/hosting')
export class HostingController {
  constructor(private hostingService: HostingService) {}

  @Get('web-pages')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: WebPageQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listWebPages(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: WebPageQueryFilter,
  ) {
    return await this.hostingService.listWebPages(context, query);
  }

  @Get('web-pages/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async getBucket(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.hostingService.getWebPage(context, id);
  }

  @Post('web-page')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateWebPageDto })
  @UseGuards(ValidationGuard)
  async createWebPage(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateWebPageDto,
  ) {
    return await this.hostingService.createWebPage(context, body);
  }

  @Patch('web-pages/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateWebPage(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.hostingService.updateWebPage(context, id, body);
  }

  @Post('web-pages/:id/deploy')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: DeployWebPageDto, skipValidation: true })
  @UseGuards(ValidationGuard)
  async deployWebPage(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DeployWebPageDto,
  ) {
    return await this.hostingService.deployWebPage(context, id, body);
  }
}
