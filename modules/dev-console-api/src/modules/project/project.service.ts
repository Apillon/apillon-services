import { HttpStatus, Injectable, Param } from '@nestjs/common';
import { CodeException, Ctx, ValidationException } from 'at-lib';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from './models/project.model';

@Injectable()
export class ProjectService {
  async createProject(
    context: DevConsoleApiContext,
    body: Project,
  ): Promise<Project> {
    return await body.insert();
  }

  async updateProject(
    context: DevConsoleApiContext,
    id: number,
    data: any,
  ): Promise<Project> {
    let project: Project = await new Project({}, { context }).populateById(id);
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.populate(data);

    try {
      await project.validate();
    } catch (err) {
      await project.handle(err);
      if (!project.isValid())
        throw new ValidationException(project, ValidatorErrorCode);
    }

    await project.update();
    return project;
  }

  async getUserProjects(@Ctx() context: DevConsoleApiContext) {
    return await new Project({}).getUserProjects(context);
  }
}
