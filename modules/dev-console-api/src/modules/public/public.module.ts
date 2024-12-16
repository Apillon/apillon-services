import { PublicService } from './public.service';
import { PublicController } from './public.controller';

import { Module } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { ProjectService } from '../project/project.service';

@Module({
  imports: [],
  controllers: [PublicController],
  providers: [PublicService, UserService, ProjectService],
})
export class PublicModule {}
