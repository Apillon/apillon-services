import {
  HttpStatus,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { FileService } from '../file/file.service';
import { File } from '../file/models/file.model';
import { User } from '../user/models/user.model';
import { ProjectUserFilter } from './dtos/project_user-query-filter.dto';
import { Project } from './models/project.model';
import { ProjectUser } from './models/project-user.model';
import {
  Ams,
  CodeException,
  DefaultUserRole,
  PopulateFrom,
  ValidationException,
} from 'at-lib';
import { ProjectUserInviteDto } from './dtos/project_user-invite.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly fileService: FileService) {}

  async createProject(
    context: DevConsoleApiContext,
    body: Project,
  ): Promise<Project> {
    const project: Project = await body.insert();
    const projectUser: ProjectUser = new ProjectUser({}, context).populate({
      project_id: project.id,
      user_id: context.user.id,
      pendingInvitation: false,
    });
    await projectUser.insert();

    //assign user role on project
    const params: any = {
      user: context.user,
      user_uuid: context.user.user_uuid,
      project_uuid: project.project_uuid,
      role_id: DefaultUserRole.PROJECT_OWNER,
    };
    await new Ams().assignUserRoleOnProject(params);

    return project;
  }

  async getProject(
    context: DevConsoleApiContext,
    id: number,
  ): Promise<Project> {
    const project: Project = await new Project({}, context).populateById(id);
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canAccess(context);

    return project;
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

    //Check permissions for specific DB record
    project.canModify(context);

    project.populate(data, PopulateFrom.PROFILE);

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

  async getUserProjects(context: DevConsoleApiContext) {
    return await new Project({}).getUserProjects(context);
  }

  async getProjectUsers(
    context: DevConsoleApiContext,
    query: ProjectUserFilter,
  ) {
    return await new ProjectUser({}, context).getProjectUsers(context, query);
  }

  async inviteUserProject(
    context: DevConsoleApiContext,
    data: ProjectUserInviteDto,
  ) {
    const project: Project = await new Project({}, context).populateById(
      data.project_id,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canModify(context);

    const authUser = await new Ams().getAuthUserByEmail(data.email);

    throw new NotImplementedException();

    const user = new User({ id: 1, email: 'test.user3@mailinator.com' });
    const project_id = data.project_id;

    // if (!user.exists()) {
    //   // TODO: Implement
    //
    // }

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
    context: DevConsoleApiContext,
    project_user_id: number,
  ) {
    const project_user = await new ProjectUser({}, context).populateById(
      project_user_id,
    );
    if (!project_user.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.PROJECT_USER_DOES_NOT_EXIST,
        sourceFunction: `${this.constructor.name}/removeUserProject`,
        context,
      });
    }

    await project_user.delete();
    return project_user;
  }

  async updateProjectImage(
    context: DevConsoleApiContext,
    project_id: number,
    uploadedFile: File,
  ) {
    const project = await new Project({}, context).populateById(project_id);
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canModify(context);
    const createdFile = await this.fileService.createFile(
      context,
      uploadedFile,
    );

    const existingProjectImageID = project.imageFile_id;
    project.imageFile_id = createdFile.id;
    await project.update();

    if (existingProjectImageID) {
      await this.fileService.deleteFileById(context, existingProjectImageID);
    }

    return createdFile;
  }
}
