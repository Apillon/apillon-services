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
  DefaultUserRole,
  ValidateFor,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { Ctx } from '../../decorators/context.decorator';
import { Permissions } from '../../decorators/permission.decorator';
import { Validation } from '../../decorators/validation.decorator';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { BucketService } from './bucket.service';

@Controller('bucket')
export class BucketController {
  constructor(private bucketService: BucketService) {}

  @Get()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: BucketQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getBucketList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BucketQueryFilter,
  ) {
    return await this.bucketService.getBucketList(context, query);
  }

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
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
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateBucket(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.bucketService.updateBucket(context, id, body);
  }

  @Delete('/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async removeUserProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.bucketService.deleteBucket(context, id);
  }
}
