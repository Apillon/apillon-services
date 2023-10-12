import {
  AdvancedSQLModel,
  ErrorCode,
  getQueryParams,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  unionSelectAndCountQuery,
} from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { ProjectUserFilter } from '../dtos/project_user-query-filter.dto';
import { Project } from './project.model';

export class ProjectUser extends AdvancedSQLModel {
  tableName = DbTables.PROJECT_USER;

  /**
   * id
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  /**
   * status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ErrorCode.STATUS_NOT_PRESENT,
      },
    ],
    defaultValue: SqlModelStatus.ACTIVE,
    fakeValue() {
      return SqlModelStatus.ACTIVE;
    },
  })
  public status?: number;

  // TODO: Implement ForeignKey constraints / verification
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
    filter: ProjectUserFilter,
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
        SELECT pu.id, pu.status, pu.user_id, pu.role_id, u.name, u.phone, u.email, false as pendingInvitation
        `,
        qFrom: `
        FROM ${DbTables.PROJECT_USER} pu
        INNER JOIN ${DbTables.USER} u ON u.id = pu.user_id
        WHERE (pu.project_id = @project_id)
      `,
      },
      {
        qSelect: `
        SELECT pu.id as id, pu.status, null as user_id, pu.role_id, null as name, null as phone, pu.email, true as pendingInvitation
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
