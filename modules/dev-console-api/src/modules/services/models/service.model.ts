/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { AdvancedSQLModel, PopulateFrom, SerializeFor } from 'at-lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';

/**
 * Service model.
 */
export class Service extends AdvancedSQLModel {
  collectionName = DbTables.SERVICE;

  /**
   * Service name
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.SERVICE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SERVICE_NAME_NOT_PRESENT,
      },
    ],
  })
  public name: string;

  /**
   * Service type
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.SERVICE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SERVICE_TYPE_NOT_PRESENT,
      },
    ],
  })
  public serviceType_id: number;

  /**
   * Service description
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.SERVICE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public description: string;

  /**
   * Service status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.SERVICE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public status: number;

  /**
   * Service active / inactive
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.SERVICE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public active: number;
}
