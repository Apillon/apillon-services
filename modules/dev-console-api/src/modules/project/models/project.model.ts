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
  SqlModelStatus,
} from '@apillon/lib';
import { selectAndCountQuery } from '@apillon/lib';

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
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
    ],
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
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_NAME_NOT_PRESENT,
      },
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
}
