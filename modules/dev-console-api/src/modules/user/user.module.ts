import { Module } from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, ProjectService],
})
export class UserModule {}
