import { Module } from '@nestjs/common';
import { FileService } from '../file/file.service';
import { ProjectService } from '../project/project.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, ProjectService, FileService],
  exports: [UserService, ProjectService, FileService],
})
export class UserModule {}
