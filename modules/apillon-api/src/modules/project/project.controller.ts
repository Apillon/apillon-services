import { Ctx } from '@apillon/modules-lib';
import { Controller, Get, Param } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { ProjectService } from './project.service';

@Controller('project')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Get('credit')
  async getProjectCredit(@Ctx() context: ApillonApiContext) {
    return await this.projectService.getProjectCredit(context);
  }
}
