import { HttpStatus, Injectable, NotImplementedException, Param } from '@nestjs/common';
import { CodeException, Ctx, ValidationException } from 'at-lib';
import { ResourceNotFoundErrorCode, ValidatorErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { User } from '../user/models/user.model';
import { Project } from './models/project.model';
import { ProjectUser } from './models/project_user.model';

@Injectable()
export class ProjectService {
  async createProject(context: DevConsoleApiContext, body: Project): Promise<Project> {
    return await body.insert();
  }

  async updateProject(context: DevConsoleApiContext, id: number, data: any): Promise<Project> {
    const project: Project = await new Project({}, { context }).populateById(id);
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
      if (!project.isValid()) throw new ValidationException(project, ValidatorErrorCode);
    }

    await project.update();
    return project;
  }

  async getUserProjects(@Ctx() context: DevConsoleApiContext) {
    return await new Project({}).getUserProjects(context);
  }

  async getProjectUsers(@Ctx() context: DevConsoleApiContext, project_id: number) {
    return await new ProjectUser({}, { context }).getProjectUsers(context, project_id);
  }

  async inviteUserProject(@Ctx() context: DevConsoleApiContext, project_id: number, data: any) {
    const user = await new User({}, { context }).populateById(data.user_id);
    if (!user.exists()) {
      // TODO: Implement
      throw new NotImplementedException();
    }

    const projectUser = new ProjectUser({}, { context });
    const isUserOnProject = await projectUser.isUserOnProject(context, project_id, data.user_id);
    if (!isUserOnProject) {
      console.log('Is user onproject ', isUserOnProject);
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

  async removeUserProject(@Ctx() context: DevConsoleApiContext, project_id: number, data: any) {
    const user_db = await new User({}, { context }).populateById(data.user_id);
    if (!user_db.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        sourceFunction: `${this.constructor.name}/removeUserProject`,
        context,
      });
    }

    const projectUser = await new ProjectUser({}, { context }).getProjectUser(context, project_id, user_db.id);
    if (!projectUser.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.PROJECT_USER_DOES_NOT_EXIST,
        sourceFunction: `${this.constructor.name}/removeUserProject`,
        context,
      });
    }

    await projectUser.delete();
    return projectUser;
  }
}
