import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  BucketQueryFilter,
  CreateBucketDto,
  PermissionLevel,
  PermissionType,
  ValidateFor,
} from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { BucketService } from './bucket.service';
import { Validation } from '../../decorators/validation.decorator';
import { Ctx } from '../../decorators/context.decorator';
import { Permissions } from '../../decorators/permission.decorator';

@Controller('bucket')
export class BucketController {
  constructor(private bucketService: BucketService) {}

  @Get()
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @Validation({ dto: BucketQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getBucketList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BucketQueryFilter,
  ) {
    return await this.bucketService.getBucketList(context, query);
  }

  @Post()
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateBucketDto })
  @UseGuards(ValidationGuard)
  async createProject(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateBucketDto,
  ) {
    return await this.bucketService.createBucket(context, body);
  }

  @Patch('/:id')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  async updateBucket(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.bucketService.updateBucket(context, id, body);
  }

  @Delete('/:id')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  async removeUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.bucketService.deleteBucket(context, id);
  }
}
