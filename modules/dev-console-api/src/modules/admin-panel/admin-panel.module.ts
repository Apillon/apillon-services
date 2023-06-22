import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';

@Module({
  imports: [UserModule, ProjectModule],
  controllers: [],
  providers: [],
})
export class AdminPanelModule {}
