import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Ams,
  CacheKeyPrefix,
  CodeException,
  DefaultUserRole,
  env,
  generateJwtToken,
  invalidateCacheKey,
  invalidateCachePrefixes,
  JwtTokenType,
  Lmas,
  LogType,
  Mailing,
  PopulateFrom,
  QuotaCode,
  Scs,
  SerializeFor,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import {
  BadRequestErrorCode,
  ConflictErrorCode,
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { FileService } from '../file/file.service';
import { File } from '../file/models/file.model';
import { User } from '../user/models/user.model';
import { ProjectUserInviteDto } from './dtos/project_user-invite.dto';
import { ProjectUserFilter } from './dtos/project_user-query-filter.dto';
import { ProjectUserUpdateRoleDto } from './dtos/project_user-update-role.dto';
import { ProjectUserPendingInvitation } from './models/project-user-pending-invitation.model';
import { ProjectUser } from './models/project-user.model';
import { Project } from './models/project.model';
import { v4 as uuidV4 } from 'uuid';
import { ProjectUserUninviteDto } from './dtos/project_user-uninvite.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly fileService: FileService) {}

  async createProject(
    context: DevConsoleApiContext,
    body: Project,
  ): Promise<Project> {
    //Check max project quota
    if (await this.isProjectsQuotaReached(context)) {
      throw new CodeException({
        code: BadRequestErrorCode.MAX_NUMBER_OF_PROJECTS_REACHED,
        status: HttpStatus.BAD_REQUEST,
        errorCodes: BadRequestErrorCode,
      });
    }

    const conn = await context.mysql.start();

    try {
      const project: Project = await body
        .populate({ project_uuid: uuidV4() })
        .insert(SerializeFor.INSERT_DB, conn);
      const projectUser: ProjectUser = new ProjectUser({}, context).populate({
        project_id: project.id,
        user_id: context.user.id,
        pendingInvitation: false,
        role_id: DefaultUserRole.PROJECT_OWNER,
      });
      await projectUser.insert(SerializeFor.INSERT_DB, conn);

      //assign user role on project
      const params: any = {
        user: context.user,
        user_uuid: context.user.user_uuid,
        project_uuid: project.project_uuid,
        role_id: DefaultUserRole.PROJECT_OWNER,
      };
      await new Ams(context).assignUserRole(params);
      await context.mysql.commit(conn);

      await invalidateCachePrefixes([CacheKeyPrefix.ADMIN_PROJECT_LIST]);
      await invalidateCacheKey(
        `${CacheKeyPrefix.AUTH_USER_DATA}:${context.user.user_uuid}`,
      );

      await new Lmas().writeLog({
        context,
        project_uuid: project.project_uuid,
        logType: LogType.INFO,
        message: 'New project created',
        location: 'DEV-CONSOLE-API/ProjectService/createProject',
        service: ServiceName.DEV_CONSOLE,
      });

      return project;
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }
  }

  async isProjectsQuotaReached(context: DevConsoleApiContext) {
    const numOfProjects = await new Project({}, context).getNumOfUserProjects();
    const maxProjectsQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_PROJECT_COUNT,
      object_uuid: context.user.user_uuid,
    });
    return !!(
      maxProjectsQuota?.value && numOfProjects >= maxProjectsQuota?.value
    );
  }

  async getProject(
    context: DevConsoleApiContext,
    uuid: string,
  ): Promise<Project> {
    const project: Project = await new Project({}, context).populateByUUID(
      uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canAccess(context);

    //Populate user role on this project
    await project.populateMyRoleOnProject(context);

    return project;
  }

  async updateProject(
    context: DevConsoleApiContext,
    uuid: string,
    data: any,
  ): Promise<Project> {
    const project: Project = await new Project({}, context).populateByUUID(
      uuid,
    );
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
      if (!project.isValid()) {
        throw new ValidationException(project, ValidatorErrorCode);
      }
    }

    await project.update();
    await invalidateCachePrefixes([CacheKeyPrefix.ADMIN_PROJECT_LIST]);

    return project;
  }

  async getUserProjects(context: DevConsoleApiContext) {
    return await new Project({}).getUserProjects(context);
  }

  async getProjectUsers(
    context: DevConsoleApiContext,
    project_uuid: string,
    query: ProjectUserFilter,
  ) {
    return await new ProjectUser({}, context).getProjectUsers(
      context,
      project_uuid,
      query,
    );
  }

  async inviteUserProject(
    context: DevConsoleApiContext,
    project_uuid: string,
    data: ProjectUserInviteDto,
  ) {
    const project: Project = await new Project({}, context).populateByUUID(
      project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canModify(context);

    //Check max users on project quota
    const numOfUsersOnProject = await project.getNumOfUsersOnProjects();
    const maxUsersOnProjectQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_USERS_ON_PROJECT,
      project_uuid: project.project_uuid,
    });
    if (
      maxUsersOnProjectQuota?.value &&
      numOfUsersOnProject >= maxUsersOnProjectQuota?.value
    ) {
      throw new CodeException({
        code: BadRequestErrorCode.MAX_NUMBER_OF_USERS_ON_PROJECT_REACHED,
        status: HttpStatus.BAD_REQUEST,
        errorCodes: BadRequestErrorCode,
      });
    }
    //Invite user to project
    const authUser = await new Ams(context).getAuthUserByEmail(data.email);
    if (authUser.data?.user_uuid) {
      //User exists - send mail with notification, that user has been added to project
      const user = await new User({}, context).populateByUUID(
        authUser.data?.user_uuid,
      );

      //check if user already on project
      if (
        await new ProjectUser({}, context).isUserOnProject(project.id, user.id)
      ) {
        throw new CodeException({
          code: ConflictErrorCode.USER_ALREADY_ON_PROJECT,
          status: HttpStatus.CONFLICT,
          errorCodes: ConflictErrorCode,
        });
      }

      const conn = await context.mysql.start();

      try {
        //Add user to project and assign role to him in AMS
        const pu = await new ProjectUser({}, context)
          .populate({
            project_id: project.id,
            user_id: user.id,
            role_id: data.role_id,
          })
          .insert(SerializeFor.INSERT_DB, conn);

        const params: any = {
          user: context.user,
          user_uuid: user.user_uuid,
          project_uuid: project.project_uuid,
          role_id: data.role_id,
        };
        await new Ams(context).assignUserRole(params);

        //send email
        await new Mailing(context).sendMail({
          emails: [data.email],
          // subject: 'New project in Apillon.io',
          template: 'user-added-to-project',
          data: {
            actionUrl: `${env.APP_URL}`,
            projectName: project.name,
          },
        });

        await context.mysql.commit(conn);
        return pu;
      } catch (err) {
        await context.mysql.rollback(conn);
        throw err;
      }
    } else {
      //user does not exists - create project-user-pending-invitation and send email with token, to register user
      const conn = await context.mysql.start();
      try {
        const pupi = await new ProjectUserPendingInvitation(
          {},
          context,
        ).populateByEmailAndProject(project.id, data.email);
        if (pupi.exists()) {
          throw new CodeException({
            code: ConflictErrorCode.USER_ALREADY_ON_PROJECT,
            status: HttpStatus.CONFLICT,
            errorCodes: ConflictErrorCode,
          });
        }

        await new ProjectUserPendingInvitation({}, context)
          .populate({
            project_id: project.id,
            email: data.email,
            role_id: data.role_id,
          })
          .insert(SerializeFor.INSERT_DB, conn);

        const token = generateJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, {
          email: data.email,
          hasPendingInvitation: true,
        });

        //send email
        await new Mailing(context).sendMail({
          emails: [data.email],
          // subject: 'You have been invited to project in Apillon.io',
          template: 'new-user-added-to-project',
          data: {
            projectName: project.name,
            actionUrl: `${env.APP_URL}/register/confirmed/?token=${token}`,
          },
        });

        await context.mysql.commit(conn);
      } catch (err) {
        await context.mysql.rollback(conn);
        throw err;
      }
    }
    return true;
  }

  async uninviteUserFromProject(
    context: DevConsoleApiContext,
    project_uuid: string,
    data: ProjectUserUninviteDto,
  ) {
    const project: Project = await new Project({}, context).populateByUUID(
      project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canModify(context);

    const pupi = await new ProjectUserPendingInvitation(
      {},
      context,
    ).populateByEmailAndProject(project.id, data.email);
    if (pupi.exists()) {
      await pupi.delete();
    }

    return true;
  }

  /**
   * Add user to projects - transfer pending invitations to ProjectUser records
   * @param email
   * @param user_id
   */
  async resolveProjectUserPendingInvitations(
    context: DevConsoleApiContext,
    email: string,
    user_id: number,
    user_uuid: string,
  ) {
    const invitations: ProjectUserPendingInvitation[] =
      await new ProjectUserPendingInvitation({}, context).getListByEmail(email);

    for (const invitation of invitations) {
      await new ProjectUser({}, context)
        .populate({
          ...invitation,
          user_id: user_id,
        })
        .insert(SerializeFor.INSERT_DB);

      const project: Project = await new Project({}, context).populateById(
        invitation.project_id,
      );
      //Assign role in AMS
      //assign user role on project
      const params: any = {
        user: context.user,
        user_uuid: user_uuid,
        project_uuid: project.project_uuid,
        role_id: invitation.role_id,
      };
      await new Ams(context).assignUserRole(params);

      await invitation.delete();
    }
  }

  async updateUserRoleOnProject(
    context: DevConsoleApiContext,
    project_user_id: number,
    body: ProjectUserUpdateRoleDto,
  ) {
    const project_user = await new ProjectUser({}, context).populateById(
      project_user_id,
    );
    if (!project_user.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.PROJECT_USER_DOES_NOT_EXIST,
        sourceFunction: `${this.constructor.name}/updateUserRoleOnProject`,
        context,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    const project: Project = await new Project({}, context).populateById(
      project_user.project_id,
    );
    project.canModify(context);

    if (project_user.role_id == DefaultUserRole.PROJECT_OWNER) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: BadRequestErrorCode.CANNOT_MODIFY_PROJECT_OWNER,
        sourceFunction: `${this.constructor.name}/updateUserRoleOnProject`,
        context,
        errorCodes: BadRequestErrorCode,
      });
    }

    //Check if role is different
    if (project_user.role_id == body.role_id) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: BadRequestErrorCode.ROLE_ON_PROJECT_ALREADY_ASSIGNED,
        sourceFunction: `${this.constructor.name}/updateUserRoleOnProject`,
        context,
        errorCodes: BadRequestErrorCode,
      });
    }

    const userToChange: User = await new User({}, context).populateById(
      project_user.user_id,
    );

    //ams - add new permission to user
    let params: any = {
      user: context.user,
      user_uuid: userToChange.user_uuid,
      project_uuid: project.project_uuid,
      role_id: body.role_id,
    };
    await new Ams(context).assignUserRole(params);

    //ams - remove previous role
    params = {
      user: context.user,
      user_uuid: userToChange.user_uuid,
      project_uuid: project.project_uuid,
      role_id: project_user.role_id,
    };
    await new Ams(context).removeUserRole(params);

    project_user.populate({ role_id: body.role_id });
    await project_user.update();

    return project_user;
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
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    if (project_user.role_id == DefaultUserRole.PROJECT_OWNER) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: BadRequestErrorCode.CANNOT_MODIFY_PROJECT_OWNER,
        sourceFunction: `${this.constructor.name}/removeUserProject`,
        context,
        errorCodes: BadRequestErrorCode,
      });
    }

    const project: Project = await new Project({}, context).populateById(
      project_user.project_id,
    );
    project.canModify(context);

    const removedUser: User = await new User({}, context).populateById(
      project_user.user_id,
    );

    const conn = await context.mysql.start();
    try {
      await project_user.delete(conn);

      //ams - remove user permission on project
      const params: any = {
        user: context.user,
        user_uuid: removedUser.user_uuid,
        project_uuid: project.project_uuid,
        role_id: project_user.role_id,
      };
      await new Ams(context).removeUserRole(params);
      await invalidateCacheKey(
        `${CacheKeyPrefix.AUTH_USER_DATA}:${removedUser.user_uuid}`,
      );

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }

    return true;
  }

  async updateProjectImage(
    context: DevConsoleApiContext,
    project_uuid: string,
    uploadedFile: File,
  ) {
    const project = await new Project({}, context).populateByUUID(project_uuid);
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
