import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Ams,
  CacheKeyPrefix,
  CodeException,
  CreditTransactionQueryFilter,
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
  SubscriptionsQueryFilter,
  InvoicesQueryFilter,
  ModelValidationException,
  ReferralMicroservice,
  writeLog,
  BaseQueryFilter,
  EmailDataDto,
  EmailTemplate,
  ConfigureCreditDto,
  StorageMicroservice,
  invalidateCacheMatch,
  InfrastructureMicroservice,
} from '@apillon/lib';
import {
  BadRequestErrorCode,
  ConflictErrorCode,
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { User } from '../user/models/user.model';
import { ProjectUserInviteDto } from './dtos/project_user-invite.dto';
import { ProjectUserUpdateRoleDto } from './dtos/project_user-update-role.dto';
import { ProjectUserPendingInvitation } from './models/project-user-pending-invitation.model';
import { ProjectUser } from './models/project-user.model';
import { Project } from './models/project.model';
import { v4 as uuidV4 } from 'uuid';
import { ProjectUserUninviteDto } from './dtos/project_user-uninvite.dto';
import { RpcPlanType } from '@apillon/lib';

@Injectable()
export class ProjectService {
  async createProject(
    context: DevConsoleApiContext,
    body: Project,
  ): Promise<Project> {
    // Check max project quota
    const { items: projects } = await new Project({}, context).getUserProjects(
      context,
      context.user.id,
      DefaultUserRole.PROJECT_OWNER,
    );
    writeLog(LogType.MSG, `Total user projects: ${projects.length}`);

    if (await this.isProjectsQuotaReached(context, projects)) {
      throw new CodeException({
        code: BadRequestErrorCode.MAX_NUMBER_OF_PROJECTS_REACHED,
        status: HttpStatus.BAD_REQUEST,
        errorCodes: BadRequestErrorCode,
      });
    }

    const conn = await context.mysql.start();
    const project = body.populate({ project_uuid: uuidV4() });
    try {
      await project.insert(SerializeFor.INSERT_DB, conn);
      await new ProjectUser({}, context)
        .populate({
          project_id: project.id,
          user_id: context.user.id,
          pendingInvitation: false,
          role_id: DefaultUserRole.PROJECT_OWNER,
        })
        .insert(SerializeFor.INSERT_DB, conn);

      // Add project owner role
      await new Ams(context).assignUserRole({
        user: context.user,
        user_uuid: context.user.user_uuid,
        project_uuid: project.project_uuid,
        role_id: DefaultUserRole.PROJECT_OWNER,
      });

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }
    // await new ReferralMicroservice(context).addPromoCodeCredits(
    //   project.project_uuid,
    //   context.user.email,
    // );
    await Promise.all([
      // Add freemium credits to project
      new Scs(context).addFreemiumCredits(project.project_uuid),

      // Invalidate project list cache and auth user data cache
      invalidateCachePrefixes([CacheKeyPrefix.ADMIN_PROJECT_LIST]),
      invalidateCacheMatch(
        `${CacheKeyPrefix.AUTH_USER_DATA}:${context.user.user_uuid}`,
      ),

      // Set mailerlite field indicating the user owns a project
      new Mailing(context).setMailerliteField('project_owner'),

      // If it's the user's first project, add credits if using promo code
      projects.length === 0 &&
        (await new ReferralMicroservice(context)
          .addPromoCodeCredits(project.project_uuid, context.user.email)
          .catch(async (err) =>
            writeLog(
              LogType.ERROR,
              err.message,
              'project.service.ts',
              'createProject',
            ),
          )),

      new Lmas().writeLog({
        context,
        project_uuid: project.project_uuid,
        logType: LogType.INFO,
        message: 'New project created',
        location: 'DEV-CONSOLE-API/ProjectService/createProject',
        service: ServiceName.DEV_CONSOLE,
      }),
    ]);

    return project;
  }

  async isProjectsQuotaReached(
    context: DevConsoleApiContext,
    projects?: Project[],
  ) {
    if (!projects) {
      const { items } = await new Project({}, context).getUserProjects(
        context,
        context.user.id,
        DefaultUserRole.PROJECT_OWNER,
      );
      projects = items;
    }
    const activeSubscriptions = await Promise.all(
      projects.map(
        async (project) =>
          (
            await new Scs(context).getProjectActiveSubscription(
              project.project_uuid,
            )
          ).data,
      ),
    );
    const totalSubscriptions = activeSubscriptions.filter((s) => s.id).length;

    const maxProjectsQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_PROJECT_COUNT,
      object_uuid: context.user.user_uuid,
    });

    return (
      maxProjectsQuota?.value &&
      projects.length - totalSubscriptions >= maxProjectsQuota.value
    );
  }

  async getProject(
    context: DevConsoleApiContext,
    uuid: string,
  ): Promise<Project> {
    const project = await new Project({}, context).populateByUUIDOrThrow(uuid);

    //Populate user role on this project
    await project.populateMyRoleOnProject(context);

    return project;
  }

  async updateProject(
    context: DevConsoleApiContext,
    uuid: string,
    data: any,
  ): Promise<Project> {
    const project = await new Project({}, context).populateByUUIDOrThrow(uuid);

    project.populate(data, PopulateFrom.PROFILE);

    if (/https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(project.name)) {
      throw new CodeException({
        code: BadRequestErrorCode.INVALID_PROJECT_NAME,
        status: HttpStatus.BAD_REQUEST,
        errorCodes: BadRequestErrorCode,
      });
    }

    await project.validateOrThrow(ModelValidationException, ValidatorErrorCode);

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
    query: BaseQueryFilter,
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
    const project = await new Project({}, context).populateByUUIDOrThrow(
      project_uuid,
    );

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
        await new Mailing(context).sendMail(
          new EmailDataDto({
            mailAddresses: [data.email],
            templateName: EmailTemplate.USER_ADDED_TO_PROJECT,
            templateData: {
              actionUrl: `${env.APP_URL}`,
              projectName: project.name,
            },
          }),
        );

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
        await new Mailing(context).sendMail(
          new EmailDataDto({
            mailAddresses: [data.email],
            templateName: EmailTemplate.NEW_USER_ADDED_TO_PROJECT,
            templateData: {
              projectName: project.name,
              actionUrl: `${env.APP_URL}/register/confirmed?token=${token}`,
            },
          }),
        );

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
    const project = await new Project({}, context).populateByUUIDOrThrow(
      project_uuid,
    );

    const pupi = await new ProjectUserPendingInvitation(
      {},
      context,
    ).populateByEmailAndProject(project.id, data.email);
    if (pupi.exists()) {
      await pupi.delete();
    }

    return true;
  }

  async getProjectOverview(
    context: DevConsoleApiContext,
    project_uuid: string,
  ) {
    await new Project({}, context).populateByUUIDOrThrow(project_uuid);

    const results = await Promise.all([
      new StorageMicroservice(context)
        .getStorageInfo(project_uuid)
        .then(({ data }) => ({ ...data }))
        .catch(),
      context.mysql
        .paramExecute(
          `
          SELECT * FROM v_projectOverview
          WHERE project_uuid = @project_uuid
          `,
          { project_uuid },
        )
        .then(({ 0: overviewData }) => ({ ...overviewData }))
        .catch(),
    ]);

    return { ...results[0], ...results[1] };
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
          user_id,
        })
        .insert(SerializeFor.INSERT_DB);

      const project: Project = await new Project({}, context).populateById(
        invitation.project_id,
      );
      //Assign role in AMS
      //assign user role on project
      const params: any = {
        user: context.user,
        user_uuid,
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
      await invalidateCacheMatch(
        `${CacheKeyPrefix.AUTH_USER_DATA}:${removedUser.user_uuid}`,
      );

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }

    return true;
  }

  //#region credit

  async getProjectCredit(context: DevConsoleApiContext, project_uuid: string) {
    return (await new Scs(context).getProjectCredit(project_uuid)).data;
  }

  async configureCreditSettings(
    context: DevConsoleApiContext,
    body: ConfigureCreditDto,
  ) {
    return (await new Scs(context).configureCredit(body)).data;
  }

  async getCreditTransactions(
    context: DevConsoleApiContext,
    project_uuid: string,
    query: CreditTransactionQueryFilter,
  ) {
    query.project_uuid = project_uuid;
    return (await new Scs(context).getCreditTransactions(query)).data;
  }

  //#endregion

  //#region subscriptions

  async getProjectActiveSubscription(
    context: DevConsoleApiContext,
    project_uuid: string,
  ) {
    await new Project({}, context).populateByUUIDOrThrow(project_uuid);

    return (await new Scs(context).getProjectActiveSubscription(project_uuid))
      .data;
  }

  async getProjectRpcPlan(context: DevConsoleApiContext, project_uuid: string) {
    const projectOwner = await new ProjectUser({}, context).getProjectOwner(
      project_uuid,
    );

    if (!projectOwner) {
      return RpcPlanType.DISABLED;
    }

    const ownerHasDwellirId = (
      await new InfrastructureMicroservice(context).hasDwellirId(
        projectOwner.user_uuid,
      )
    ).data;

    if (!ownerHasDwellirId) {
      return RpcPlanType.DISABLED;
    }

    const projectsUuids = await new ProjectUser(
      {},
      context,
    ).getProjectUuidsByOwnerId(projectOwner.user_id);

    const hasActiveRpcPlan = (
      await new Scs(context).hasProjectActiveRpcPlan(projectsUuids)
    ).data;

    return hasActiveRpcPlan ? RpcPlanType.DEVELOPER : RpcPlanType.FREE;
  }

  async getProjectSubscriptions(
    context: DevConsoleApiContext,
    query: SubscriptionsQueryFilter,
  ) {
    await new Project({}, context).populateByUUIDOrThrow(query.project_uuid);

    return (await new Scs(context).listSubscriptions(query)).data;
  }

  async getProjectInvoices(
    context: DevConsoleApiContext,
    query: InvoicesQueryFilter,
  ) {
    await new Project({}, context).populateByUUIDOrThrow(query.project_uuid);

    return (await new Scs(context).listInvoices(query)).data;
  }

  // #endregion
}
