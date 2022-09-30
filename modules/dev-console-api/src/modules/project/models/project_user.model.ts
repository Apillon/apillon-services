import { AdvancedSQLModel, selectAndCountQuery, SerializeFor } from 'at-lib';
import { prop } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { integerParser } from '@rawmodel/parsers';
import { DevConsoleApiContext } from '../../../context';
import { ProjectUserFilter } from '../dtos/project_user-query-filter.dto';

export class ProjectUser extends AdvancedSQLModel {
  collectionName = DbTables.PROJECT_USER;

  /**
   * Project key
   */
  // TODO: Implement ForeignKey constraints / verification
  @prop({
    parser: { resolver: integerParser() },
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public project_id: number;

  /**
   * User key
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_USER_ID_NOT_PRESENT,
      },
    ],
  })
  public user_id: number;

  /**
   * Project foreign key
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB],
    validators: [],
  })
  public pendingInvitation: boolean;

  public async isUserOnProject(
    context: DevConsoleApiContext,
    project_id: number,
    user_id: number,
  ): Promise<boolean> {
    if (!user_id || !project_id) {
      return false;
    }

    const data = await context.mysql.paramExecute(
      `
        SELECT 1
        FROM ${DbTables.PROJECT_USER}
        WHERE project_id = @project_id AND user_id = @user_id
      `,
      { project_id, user_id },
    );

    return data[0] !== undefined;
  }

  /**
   * Return projectUser for project_id
   *
   * @param project_id
   * @returns project_user list
   */
  public async getProjectUsers(
    context: DevConsoleApiContext,
    filter: ProjectUserFilter,
  ) {
    const params = {
      project_id: filter.project_id,
      user_id: filter.user_id || null,
      offset: 0,
      limit: 20,
    };

    const sqlQuery = {
      qSelect: `
        SELECT pu.*
        `,
      qFrom: `
        FROM ${DbTables.PROJECT_USER} pu
        WHERE (pu.project_id = ${params.project_id})
        AND (${params.user_id} IS NULL OR pu.user_id = ${params.user_id} )
        `,
      qFilter: `
        LIMIT ${params.limit} OFFSET ${params.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'pu.id');
  }
}
