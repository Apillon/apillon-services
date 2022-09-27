import { AdvancedSQLModel, Context, PopulateFrom, SerializeFor } from 'at-lib';
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

  public async getProjectUser(context: DevConsoleApiContext, project_id: number, user_id: number) {
    // TODO: Maybe streamline together with getProjectUsers???
    const data = await context.mysql.paramExecute(
      `
      SELECT *
      FROM ${DbTables.PROJECT_USER}
      WHERE project_id = @project_id AND user_id = @user_id
      `,
      { project_id, user_id },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async isUserOnProject(context: DevConsoleApiContext, project_id: number, user_id: number) {
    if (!user_id) {
      return false;
    }

    const data = await context.mysql.paramExecute(
      `
        SELECT COUNT(*) as 'count'
        FROM ${DbTables.PROJECT_USER}
        WHERE project_id = @project_id AND user_id = @user_id
      `,
      { project_id, user_id },
    );

    return data[0].count >= 1; // Should be always 1, no??
  }

  /**
   * Return projectUser for project_id
   *
   * @param project_id
   * @returns project_user list
   */
  public async getProjectUsers(context: DevConsoleApiContext, project_id: number) {
    if (!project_id) {
      return [];
    }

    return await context.mysql.paramExecute(
      `
        SELECT *
        FROM ${DbTables.PROJECT_USER}
        WHERE project_id = @project_id
      `,
      { project_id },
    );
  }
}
