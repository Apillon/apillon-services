/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import {
  AdvancedSQLModel,
  CodeException,
  DefaultUserRole,
  ForbiddenErrorCodes,
  getQueryParams,
  PopulateFrom,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';

import { faker } from '@faker-js/faker';
import { HttpStatus } from '@nestjs/common';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { ProjectQueryFilter } from '../../admin-panel/project/dtos/project-query-filter.dto';

/**
 * Project model.
 */
export class Project extends AdvancedSQLModel {
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
    fakeValue: () => faker.word.verb(),
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
    fakeValue: () => faker.lorem.paragraph(5),
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

  public canAccess(context: DevConsoleApiContext) {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_USER,
          DefaultUserRole.ADMIN,
        ],
        this.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }
  }

  public canModify(context: DevConsoleApiContext) {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.ADMIN,
        ],
        this.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions to modify this record',
      });
    }
  }

  public async populateByUUID(uuid: string): Promise<this> {
    if (!uuid) {
      throw new Error('uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE project_uuid = @uuid AND status <> ${SqlModelStatus.DELETED};
      `,
      { uuid },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async getProjectDetail(project_uuid: string) {
    const data = await this.db().paramExecute(
      `
        SELECT ${this.generateSelectFields()}
        FROM \`${DbTables.PROJECT}\` p
        WHERE p.project_uuid = @project_uuid
      `,
      { project_uuid },
    );
    return data?.length ? data[0] : data;
  }

  /**
   * Returns all user projects
   */

  public async getUserProjects(context: DevConsoleApiContext) {
    const params = {
      user_id: context.user.id,
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

  public async listAllProjects(
    context: DevConsoleApiContext,
    filter: ProjectQueryFilter,
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
      qSelect: `SELECT ${this.generateSelectFields('p')}`,
      qFrom: `FROM \`${DbTables.PROJECT}\` p
        WHERE (@search IS null OR p.name LIKE CONCAT('%', @search, '%'))`,
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
