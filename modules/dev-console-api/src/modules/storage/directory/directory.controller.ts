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
  ValidateFor,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../../context';
import { ValidationGuard } from '../../../guards/validation.guard';
import { DirectoryService } from './directory.service';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';

@Controller('directories')
export class DirectoryController {
  constructor(private directoryService: DirectoryService) {}

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
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

  @Patch(':id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async updateDirectory(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.directoryService.updateDirectory(context, id, body);
  }

  @Patch(':id/cancel-deletion')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async cancelDirectoryDeletion(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.directoryService.cancelDirectoryDeletion(context, id);
  }

  @Delete(':id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async deleteDirectory(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.directoryService.deleteDirectory(context, id);
  }

  @Get('directory-content')
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
  async getDirectoryContent(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: DirectoryContentQueryFilter,
  ) {
    return await this.directoryService.listDirectoryContent(context, query);
  }
}