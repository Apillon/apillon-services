import { DefaultUserRole } from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { FileService } from './file.service';
import { File } from './models/file.model';

@Controller('files')
export class FileController {
  constructor(private fileService: FileService) {}

  @Get(':id')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getFile(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<File> {
    return await this.fileService.getFileById(context, id);
  }

  @Post()
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  @Validation({ dto: File })
  @UseGuards(ValidationGuard)
  async createFile(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: File,
  ): Promise<File> {
    return await this.fileService.createFile(context, body);
  }

  @Delete(':id')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async deleteFile(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.fileService.deleteFileById(context, id);
  }
}
