/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import {
  AdvancedSQLModel,
  CodeException,
  DefaultUserRole,
  ForbiddenErrorCodes,
  PopulateFrom,
  SerializeFor,
} from 'at-lib';
import { selectAndCountQuery } from 'at-lib';

import { v4 as uuidV4 } from 'uuid';
import { faker } from '@faker-js/faker';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { HttpStatus } from '@nestjs/common';

/**
 * Project model.
 */
export class Project extends AdvancedSQLModel {
  tableName = DbTables.PROJECT;

  /**
   * Project's UUID
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.ADMIN, SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_UUID_NOT_PRESENT,
      },
    ],
    defaultValue: uuidV4(),
    fakeValue: uuidV4(),
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
    fakeValue: faker.word.verb(),
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
    fakeValue: faker.lorem.paragraph(5),
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
        errorMessage: 'Insufficient permissins',
      });
    }
  }

  public canModify(context: DevConsoleApiContext) {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_USER,
          DefaultUserRole.ADMIN,
        ],
        this.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissins',
      });
    }
  }

  /**
   * Returns projects created by user
   * (TODO: returns projects which contain the given user as collaborator)
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
        FROM project p
        WHERE p.createUser = ${params.user_id}
        `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'p.id');
  }
}
