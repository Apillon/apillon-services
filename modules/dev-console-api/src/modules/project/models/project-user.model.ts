import {
  AdvancedSQLModel,
  BaseQueryFilter,
  DefaultUserRole,
  getQueryParams,
  PopulateFrom,
  SerializeFor,
  unionSelectAndCountQuery,
} from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { Project } from './project.model';

export class ProjectUser extends AdvancedSQLModel {
  tableName = DbTables.PROJECT_USER;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public project_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_USER_ID_NOT_PRESENT,
      },
    ],
  })
  public user_id: number;

  @prop({
    parser: { resolver: integerParser() },
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
        code: ValidatorErrorCode.PROJECT_USER_ROLE_ID_NOT_PRESENT,
      },
    ],
  })
  public role_id: number;

  public async populateByProjectAndUser(
    project_id: number,
    user_id: number,
  ): Promise<this> {
    if (!user_id || !project_id) {
      return this.reset();
    }

    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM ${this.tableName}
        WHERE project_id = @project_id AND user_id = @user_id
      `,
      { project_id, user_id },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async getProjectOwnerId(
    project_uuid: string,
  ): Promise<number | undefined> {
    if (!project_uuid) {
      throw new Error('Project UUID is required');
    }

    const data = await this.getContext().mysql.paramExecute(
      `SELECT pu.user_id FROM ${DbTables.PROJECT_USER} pu
      LEFT JOIN ${DbTables.PROJECT} p ON p.id = pu.project_id
      WHERE p.project_uuid = @project_uuid AND pu.role_id = ${DefaultUserRole.PROJECT_OWNER}`,
    );

    return data?.length ? data[0].user_id : undefined;
  }

  public async getProjectUuidsByOwnerId(userId: number): Promise<string[]> {
    if (!userId) {
      return [];
    }

    const data = await this.getContext().mysql.paramExecute(
      `SELECT p.project_uuid FROM ${DbTables.PROJECT_USER} pu
      LEFT JOIN ${DbTables.PROJECT} p ON p.id = pu.project_id
      WHERE pu.user_id = @user_id AND pu.role_id = ${DefaultUserRole.PROJECT_OWNER}`,
      { user_id: userId },
    );

    return data.map((d) => d.project_uuid);
  }

  public async isUserOnProject(
    project_id: number,
    user_id: number,
  ): Promise<boolean> {
    if (!user_id || !project_id) {
      return false;
    }

    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT 1
        FROM ${DbTables.PROJECT_USER}
        WHERE project_id = @project_id AND user_id = @user_id
      `,
      { project_id, user_id },
    );

    return data.length > 0 ? true : false;
  }

  /**
   * Return projectUser for project_id
   *
   * @param project_id
   * @returns project_user list
   */
  public async getProjectUsers(
    context: DevConsoleApiContext,
    project_uuid: string,
    filter: BaseQueryFilter,
  ) {
    const project: Project = await new Project(
      {},
      context,
    ).populateByUUIDAndCheckAccess(project_uuid, context);

    const { params, filters } = getQueryParams(
      { ...filter.getDefaultValues(), project_id: project.id },
      'pu',
      {},
      filter.serialize(),
    );

    const qSelects = [
      {
        qSelect: `
        SELECT pu.id, pu.status, pu.user_id, pu.role_id, u.user_uuid, u.name, u.phone, u.email, false as pendingInvitation
        `,
        qFrom: `
        FROM ${DbTables.PROJECT_USER} pu
        INNER JOIN ${DbTables.USER} u ON u.id = pu.user_id
        WHERE (pu.project_id = @project_id)
      `,
      },
      {
        qSelect: `
        SELECT pu.id as id, pu.status, null as user_id, pu.role_id, null as user_uuid, null as name, null as phone, pu.email, true as pendingInvitation
        `,
        qFrom: `
        FROM ${DbTables.PROJECT_USER_PENDING_INVITATION} pu
        WHERE (pu.project_id = @project_id)
      `,
      },
    ];
    return unionSelectAndCountQuery(
      context.mysql,
      {
        qSelects: qSelects,
        qFilter: `LIMIT ${filters.limit} OFFSET ${filters.offset};`,
      },
      params,
      'email',
    );
  }
}
