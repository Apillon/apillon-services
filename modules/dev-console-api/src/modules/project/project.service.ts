import {
  HttpStatus,
  Injectable,
  NotImplementedException,
  Param,
} from '@nestjs/common';
import { CodeException, Ctx, ValidationException } from 'at-lib';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { User } from '../user/models/user.model';
import { Project } from './models/project.model';
import { ProjectUser } from './models/project_user.model';

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
    const project: Project = await new Project({}, context).populateById(id);
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

  async getProjectUsers(
    @Ctx() context: DevConsoleApiContext,
    project_id: number,
  ) {
    return await new ProjectUser({}, context).getProjectUsers(
      context,
      project_id,
    );
  }

  async inviteUserProject(
    @Ctx() context: DevConsoleApiContext,
    project_id: number,
    data: any,
  ) {
    const user = await new User({}, context).getUserByEmail(data.email);
    if (!user.exists()) {
      // TODO: Implement
      throw new NotImplementedException();
    }

    const projectUser = new ProjectUser({}, context);
    const isUserOnProject = await projectUser.isUserOnProject(
      context,
      project_id,
      user.id,
    );

    if (!isUserOnProject) {
      projectUser.populate({
        project_id: project_id,
        user_id: user.id,
        pendingInvitation: true,
      });

      try {
        await projectUser.validate();
      } catch (error) {
        await projectUser.handle(error);
      }
      if (!projectUser.isValid()) {
        throw new ValidationException(projectUser);
      }
      await projectUser.insert();
    } else {
      throw new CodeException({
        status: HttpStatus.CONFLICT,
        code: ValidatorErrorCode.PROJECT_USER_RELATION_EXISTS,
        sourceFunction: `${this.constructor.name}/removeUserProject`,
        context,
      });
    }

    return projectUser;
  }

  async removeUserProject(
    @Ctx() context: DevConsoleApiContext,
    project_user_id: number,
  ) {
    const project_user = await new ProjectUser({}, context).populateById(
      project_user_id,
    );
    if (!project_user.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        sourceFunction: `${this.constructor.name}/removeUserProject`,
        context,
      });
    }

    await project_user.delete();
    return project_user;
  }
}
