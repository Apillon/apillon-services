import {
  CreateDirectoryDto,
  DefaultPermission,
  DefaultUserRole,
  DirectoryContentQueryFilter,
  RoleGroup,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { AuthGuard } from '../../../guards/auth.guard';
import { ValidationGuard } from '../../../guards/validation.guard';
import { DirectoryService } from './directory.service';

@Controller('directories')
@Permissions({ permission: DefaultPermission.STORAGE })
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

  @Patch(':directory_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async updateDirectory(
    @Ctx() context: DevConsoleApiContext,
    @Param('directory_uuid') directory_uuid: string,
    @Body() body: any,
  ) {
    return await this.directoryService.updateDirectory(
      context,
      directory_uuid,
      body,
    );
  }

  @Patch(':directory_uuid/cancel-deletion')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async cancelDirectoryDeletion(
    @Ctx() context: DevConsoleApiContext,
    @Param('directory_uuid') directory_uuid: string,
  ) {
    return await this.directoryService.cancelDirectoryDeletion(
      context,
      directory_uuid,
    );
  }

  @Delete(':directory_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async deleteDirectory(
    @Ctx() context: DevConsoleApiContext,
    @Param('directory_uuid') directory_uuid: string,
  ) {
    return await this.directoryService.deleteDirectory(context, directory_uuid);
  }

  @Get('directory-content')
  @Permissions({ role: RoleGroup.ProjectAccess })
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
