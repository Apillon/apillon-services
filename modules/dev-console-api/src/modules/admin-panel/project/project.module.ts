import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';

@Module({
  imports: [],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
