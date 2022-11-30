import { Module } from '@nestjs/common';
import { FileService } from '../file/file.service';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, FileService],
})
export class ProjectModule {}
