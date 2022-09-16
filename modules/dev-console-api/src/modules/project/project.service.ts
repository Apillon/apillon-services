import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { Project } from './models/project.model';

@Injectable()
export class ProjectService {
  async createProject(context: DevConsoleApiContext, body: Project): Promise<Project> {
    return await body.insert();
  }
}
