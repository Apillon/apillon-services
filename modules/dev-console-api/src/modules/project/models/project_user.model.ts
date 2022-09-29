import {
  AdvancedSQLModel,
  PopulateFrom,
  selectAndCountQuery,
  SerializeFor,
} from 'at-lib';
import { prop } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { integerParser } from '@rawmodel/parsers';
import { DevConsoleApiContext } from '../../../context';

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
  ) {
    if (!user_id) {
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

    return data[0] >= 1; // Should be always 1, no??
  }

  /**
   * Return projectUser for project_id
   *
   * @param project_id
   * @returns project_user list
   */
  public async getProjectUsers(
    context: DevConsoleApiContext,
    project_id: number,
    user_id: number,
  ) {
    const params = {
      project_id: project_id,
      user_id: user_id,
    };

    const sqlQuery = {
      qSelect: `
        SELECT pu.*
        `,
      qFrom: `
        FROM ${DbTables.PROJECT_USER} pu
        WHERE (pu.project_id = ${project_id})
        AND (${user_id} IS NULL OR pu.user_id = ${user_id} )
        `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'pu.id');
  }
}
