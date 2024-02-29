/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
