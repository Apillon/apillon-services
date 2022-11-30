import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';

export class ProjectUserPendingInvitation extends AdvancedSQLModel {
  tableName = DbTables.PROJECT_USER_PENDING_INVITATION;

  // TODO: Implement ForeignKey constraints / verification
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
        code: ValidatorErrorCode.PROJECT_USER_PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public project_id: number;

  @prop({
    parser: { resolver: stringParser() },
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
        code: ValidatorErrorCode.PROJECT_USER_EMAIL_NOT_PRESENT,
      },
    ],
  })
  public email: string;

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
        code: ValidatorErrorCode.PROJECT_USER_ROLE_ID_NOT_PRESENT,
      },
    ],
  })
  public role_id: number;

  public async populateByEmailAndProject(
    project_id: number,
    email: string,
  ): Promise<this> {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE project_id = @project_id AND email = @email AND status <> ${SqlModelStatus.DELETED};
      `,
      { project_id, email },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async getListByEmail(
    email: string,
  ): Promise<ProjectUserPendingInvitation[]> {
    if (!email) {
      throw new Error('email should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE email = @email AND status <> ${SqlModelStatus.DELETED};
      `,
      { email },
    );

    if (data && data.length) {
      const invitations = [];
      for (const i of data)
        invitations.push(
          new ProjectUserPendingInvitation(i, this.getContext()),
        );
      return invitations;
    } else {
      return [];
    }
  }
}
