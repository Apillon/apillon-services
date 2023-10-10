/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import {
  ProjectAccessModel,
  BaseQueryFilter,
  DefaultUserRole,
  getQueryParams,
  PopulateFrom,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  getFaker,
  CodeException,
} from '@apillon/lib';
import {
  DbTables,
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';

/**
 * Project model.
 */
export class Project extends ProjectAccessModel {
  tableName = DbTables.PROJECT;

  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  /**
   * Project's UUID
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public project_uuid: string;

  /**
   * Project name
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_NAME_NOT_PRESENT,
      },
    ],
    fakeValue: () => getFaker().word.verb(),
  })
  public name: string;

  /**
   * Project description
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public shortDescription: string;

  /**
   * Project full description
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    fakeValue: () => getFaker().lorem.paragraph(5),
  })
  public description: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public imageFile_id: number;

  /**
   * Created at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.APILLON_API, SerializeFor.SELECT_DB],
    populatable: [PopulateFrom.DB],
  })
  public createTime?: Date;

  /**
   * Updated at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.APILLON_API, SerializeFor.SELECT_DB],
    populatable: [PopulateFrom.DB],
  })
  public updateTime?: Date;

  /*******************************************
   * INFO properties
   ***************************************/
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public myRole_id_onProject: number;

  /*******************************************
   * Methods
   ********************************************/

  public override async populateByUUID(uuid: string): Promise<this> {
    return super.populateByUUID(uuid, 'project_uuid');
  }

  public async populateByUUIDAndCheckAccess(
    uuid: string,
    context: DevConsoleApiContext,
  ): Promise<this> {
    const project = await this.populateByUUID(uuid);

    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: 404,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canAccess(context);

    return project;
  }

  /**
   * Returns all user projects
   * @param context
   * @param user_id if null, projects of user in context are returned
   * @returns
   */
  public async getUserProjects(
    context: DevConsoleApiContext,
    user_id?: number,
  ) {
    const params = {
      user_id: user_id || context.user.id,
    };
    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('p', '', SerializeFor.SELECT_DB)}
        `,
      qFrom: `
        FROM ${DbTables.PROJECT} p
        INNER JOIN ${DbTables.PROJECT_USER} pu ON pu.project_id = p.id
        WHERE pu.user_id = ${params.user_id}
        `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'p.id');
  }

  /**
   * Update status (block, unblock) of all user projects
   * @param userId
   * @param status
   * @returns
   */
  public async updateUserProjectsStatus(userId: number, status: number) {
    await this.getContext().mysql.paramExecute(
      `
      UPDATE \`${this.tableName}\` p
      SET p.status = @status
      WHERE EXISTS (
        SELECT 1 FROM \`${DbTables.PROJECT_USER}\` pu
        WHERE pu.user_id = @userId
        AND pu.project_id = p.id
      )
      AND p.status IN ( ${SqlModelStatus.ACTIVE}, ${SqlModelStatus.BLOCKED} )
      `,
      { userId, status },
    );

    return true;
  }

  public async listProjects(
    context: DevConsoleApiContext,
    filter: BaseQueryFilter,
  ) {
    // Map url query with sql fields.
    const fieldMap = { id: 'p.d' };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'p',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields('p')},
      (SELECT COUNT(*) FROM ${
        DbTables.PROJECT_USER
      } WHERE project_id = p.id) AS totalUsers,
      (SELECT COUNT(*) FROM ${
        DbTables.SERVICE
      } WHERE project_id = p.id) AS totalServices`,
      qFrom: `FROM \`${DbTables.PROJECT}\` p
        WHERE (@search IS null OR p.name LIKE CONCAT('%', @search, '%'))
        AND status <> ${SqlModelStatus.DELETED}`,
      qFilter: `
          ORDER BY ${filters.orderStr}
          LIMIT ${filters.limit} OFFSET ${filters.offset}
        `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'p.id');
  }

  public async getNumOfUserProjects() {
    const context = await this.getContext();
    const data = await context.mysql.paramExecute(
      `
      SELECT COUNT(*) as numOfProjects
      FROM \`${DbTables.PROJECT_USER}\`
      WHERE user_id = @user_id
      AND role_id = @role_id
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { user_id: context.user.id, role_id: DefaultUserRole.PROJECT_OWNER },
    );

    return data[0].numOfProjects;
  }

  public async getNumOfUsersOnProjects() {
    const context = await this.getContext();
    const data = await context.mysql.paramExecute(
      `
      select sum(project_users.numOfUsers) as numOfUsersOnProject
      from (
        SELECT count(*) as numOfUsers
        from \`${DbTables.PROJECT_USER}\`
        WHERE project_id = @project_id
        AND status <> ${SqlModelStatus.DELETED}
          union all
        select count(*) as numOfUsers
        from \`${DbTables.PROJECT_USER_PENDING_INVITATION}\`
        WHERE project_id = @project_id
        AND status <> ${SqlModelStatus.DELETED}
      ) project_users
      `,
      { project_id: this.id },
    );

    return data[0].numOfUsersOnProject;
  }

  public async populateMyRoleOnProject(context: DevConsoleApiContext) {
    const roleOnProject = context.user.authUser.authUserRoles.find(
      (x) => x.project_uuid == this.project_uuid,
    );
    this.myRole_id_onProject = roleOnProject?.role.id;
  }
}
