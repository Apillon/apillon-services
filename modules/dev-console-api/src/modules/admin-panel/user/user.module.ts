import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ProjectService } from '../../project/project.service';
import { FileService } from '../../file/file.service';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService, ProjectService, FileService],
})
export class UserModule {}
