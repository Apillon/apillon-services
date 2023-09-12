/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { AdvancedSQLModel, PopulateFrom, SerializeFor } from '@apillon/lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';

/**
 * Document model.
 */
export class File extends AdvancedSQLModel {
  /**
   * Document's table.
   */
  tableName = DbTables.FILE;

  /**
   * Document name property definition.
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILE_NAME_NOT_PRESENT,
      },
    ],
    //fakeValue: () => getFaker().lorem.word(),
  })
  public name: string;

  /**
   * Document extension property definition.
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILE_EXTENSION_NOT_PRESENT,
      },
    ],
  })
  public extension: string;

  /**
   * Document content type property definition.
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILE_CONTENT_TYPE_NOT_PRESENT,
      },
    ],
  })
  public contentType: string;

  /**
   * Document key generated property.
   */
  @prop({
    parser: { resolver: stringParser() },
    getter() {
      return `${this.name}-${this.id}-dev-console-api.${this.extension}`;
    },
  })
  public key: string;

  /**
   * Document body - actual content of document
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, SerializeFor.ADMIN],
    serializable: [SerializeFor.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILE_BODY_NOT_PRESENT,
      },
    ],
  })
  public body: string;
}
