import {
  CacheKeyPrefix,
  DefaultUserRole,
  NFTCollectionQueryFilter,
  ValidateFor,
} from '@apillon/lib';
import {
  Cache,
  CacheInterceptor,
  Ctx,
  Permissions,
  Validation,
} from '@apillon/modules-lib';
import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { AuthGuard } from '../../../guards/auth.guard';
import { NftsService } from './nfts.service';
import { ValidationGuard } from '../../../guards/validation.guard';

@Controller('admin-panel/nfts')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Get('collections')
  @Validation({
    dto: NFTCollectionQueryFilter,
    validateFor: ValidateFor.QUERY,
    skipValidation: true,
  })
  @UseGuards(ValidationGuard)
  @Cache({ keyPrefix: CacheKeyPrefix.ADMIN_NFTS_COLLECTION_LIST })
  async getNftCollectionsList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: NFTCollectionQueryFilter,
  ) {
    return await this.nftsService.getNftCollectionsList(context, query);
  }
}
