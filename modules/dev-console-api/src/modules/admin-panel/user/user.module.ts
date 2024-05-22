import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ProjectService } from '../../project/project.service';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService, ProjectService],
})
export class UserModule {}
