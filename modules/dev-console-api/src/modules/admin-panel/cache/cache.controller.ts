import {
  DefaultUserRole,
  PopulateFrom,
  flushCache,
  invalidateCachePrefixes,
} from '@apillon/lib';
import { Body, Controller, Delete, UseGuards } from '@nestjs/common';
import { Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { RemoveCacheKeyDto } from './dtos/remove-cache-key.dto';
import { ValidationGuard } from '../../../guards/validation.guard';

@Controller('admin-panel/cache')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class CacheController {
  /**
   * Deletes a cache key based on key prefix, projectUuid (optional) and userId (optional)
   * @async
   * @param {RemoveCacheKeyDto} removeCacheKeyDto - Body data
   * @returns {Promise<void>}
   */
  @Delete()
  @Validation({ dto: RemoveCacheKeyDto, populateFrom: PopulateFrom.ADMIN })
  @UseGuards(ValidationGuard)
  async removeCacheKey(
    @Body() { cacheKey, userId, projectUuid }: RemoveCacheKeyDto,
  ): Promise<void> {
    return await invalidateCachePrefixes([cacheKey], userId, projectUuid);
  }

  /**
   * Flush whole redis cache, this removes ALL keys in storage
   * @async
   * @returns {Promise<void>}
   */
  @Delete('flush')
  async flushCache(): Promise<void> {
    return await flushCache();
  }
}
