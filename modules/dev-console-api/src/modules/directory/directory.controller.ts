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
  CreateDirectoryDto,
  DefaultUserRole,
  DirectoryContentQueryFilter,
  PermissionLevel,
  PermissionType,
  ValidateFor,
} from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { DirectoryService } from './directory.service';
import { Validation } from '../../decorators/validation.decorator';
import { Ctx } from '../../decorators/context.decorator';
import { Permissions } from '../../decorators/permission.decorator';

@Controller('directory')
export class DirectoryController {
  constructor(private directoryService: DirectoryService) {}

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateDirectoryDto })
  @UseGuards(ValidationGuard)
  async createDirectory(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateDirectoryDto,
  ) {
    return await this.directoryService.createDirectory(context, body);
  }

  @Patch('/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateDirectory(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.directoryService.updateDirectory(context, id, body);
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
    return await this.directoryService.deleteDirectory(context, id);
  }

  @Get('/listDirectoryContent')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({
    dto: DirectoryContentQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async getBucketList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: DirectoryContentQueryFilter,
  ) {
    return await this.directoryService.listDirectoryContent(context, query);
  }
}
