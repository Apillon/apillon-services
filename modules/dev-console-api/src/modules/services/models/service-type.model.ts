/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { booleanParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';

import { DbTables, ValidatorErrorCode } from '../../../config/types';

/**
 * Service model.
 */
export class ServiceType extends AdvancedSQLModel {
  tableName = DbTables.SERVICE_TYPE;

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
        code: ValidatorErrorCode.DEFAULT_VALIDATION_ERROR,
      },
    ],
  })
  public name: string;

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
  public description: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public active: boolean;

  public async getServiceTypes() {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT ${this.generateSelectFields()}
      FROM \`${this.tableName}\`
      WHERE status <> ${SqlModelStatus.DELETED};
      `,
      {},
    );
  }
}
