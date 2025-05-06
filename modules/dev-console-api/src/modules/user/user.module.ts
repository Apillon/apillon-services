import { Module } from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  controllers: [UserController],
  providers: [UserService, ProjectService, GoogleStrategy],
  exports: [UserService, ProjectService],
})
export class UserModule {}
