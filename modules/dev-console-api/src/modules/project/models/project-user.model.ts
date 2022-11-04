import {
  AdvancedSQLModel,
  CodeException,
  getQueryParams,
  PopulateFrom,
  selectAndCountQuery,
  SerializeFor,
} from 'at-lib';
import { prop } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';
import {
  DbTables,
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../../config/types';
import { integerParser } from '@rawmodel/parsers';
import { DevConsoleApiContext } from '../../../context';
import { ProjectUserFilter } from '../dtos/project_user-query-filter.dto';
import { Project } from './project.model';
import { HttpStatus } from '@nestjs/common';

export class ProjectUser extends AdvancedSQLModel {
  tableName = DbTables.PROJECT_USER;

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
    filter: ProjectUserFilter,
  ) {
    const project: Project = await new Project({}, context).populateById(
      filter.project_id,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canAccess(context);

    // Map url query with sql fields.
    const fieldMap = {
      id: 'pu.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'pu',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('pu')}, u.name, u.phone, u.email
        `,
      qFrom: `
        FROM ${DbTables.PROJECT_USER} pu
        INNER JOIN ${DbTables.USER} u ON u.id = pu.user_id
        WHERE (pu.project_id = ${params.project_id})
        `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'pu.id');
  }
}
