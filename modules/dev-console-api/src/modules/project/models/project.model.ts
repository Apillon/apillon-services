/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import { AdvancedSQLModel, PopulateFrom, SerializeFor } from 'at-lib';
import { selectAndCountQuery } from 'at-lib';

import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';

/**
 * Project model.
 */
export class Project extends AdvancedSQLModel {
  collectionName = DbTables.PROJECT;

  /**
   * Project's UUID
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_UUID_NOT_PRESENT,
      },
    ],
    defaultValue: uuidv4(),
    fakeValue: uuidv4(),
  })
  public project_uuid: string;

  /**
   * Project name
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
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
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public shortDescription: string;

  /**
   * Project full description
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
    fakeValue: faker.lorem.paragraph(5),
  })
  public description: string;

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
        SELECT p.*
        `,
      qFrom: `
        FROM project p
        WHERE p.createUser = ${params.user_id}
        `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'p.id');
  }
}
