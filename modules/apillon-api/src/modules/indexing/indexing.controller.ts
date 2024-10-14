import { AttachedServiceType, DefaultApiKeyRole } from '@apillon/lib';
import { ApiKeyPermissions, Ctx } from '@apillon/modules-lib';
import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { IndexingService } from './indexing.service';

@Controller('indexing')
export class IndexingController {
  constructor(private readonly service: IndexingService) {}

  @Get('indexer/:indexer_uuid/upload-url')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.INDEXING,
  })
  @UseGuards(AuthGuard)
  async getUrlForSourceCodeUpload(
    @Ctx() context: ApillonApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.service.getUrlForSourceCodeUpload(context, indexer_uuid);
  }

  @Post('indexer/:indexer_uuid/deploy')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.INDEXING,
  })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async deployIndexer(
    @Ctx() context: ApillonApiContext,
    @Param('indexer_uuid') indexer_uuid: string,
  ) {
    return await this.service.deployIndexer(context, indexer_uuid);
  }
}
