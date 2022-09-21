/* eslint-disable @typescript-eslint/member-ordering */
import { Inject } from '@nestjs/common';
import { prop } from '@rawmodel/core';
import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { AdvancedSQLModel, PopulateFrom, SerializeFor } from 'at-lib';
import { DbTables, ValidatorErrorCode, SqlModelStatus } from '../../../config/types';
import { getQueryParams, selectAndCountQuery } from '../../../lib/sql-utils';

/**
 * Service model.
 */
export class Service extends AdvancedSQLModel {
  constructor(@Inject('MYSQL_DB')) {
    super()
  }
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

  /**
   * Returns ids, names and types of active services.
   * @param conn optional connection
   */
  public async getServices(filter: any) {
    // const context: Context = this.getContext();

    // Set default values or null for all params that we pass to sql query.
    const defaultParams = {
      id: null,
      search: null,
      status: null,
      filterIds: null,
      type: null,
    };

    // Map url query with sql fields.
    const fieldMap = {
      id: 'bc.id',
    };

    const { params, filters } = getQueryParams(defaultParams, 'bc', fieldMap, filter);

    const sqlQuery = {
      qSelect: `
        SELECT DISTINCT
          ${this.generateSelectFields('bc', '')}
        `,
      qFrom: `
        FROM \`${DbTables.SERVICE}\` bc
        WHERE
          (@id IS NULL OR bc.id = @id)
          AND (
            @filterIds IS NULL
            OR (@filterIds IS NOT NULL AND FIND_IN_SET(bc.id, @filterIds))
          )
          AND (
            (@status IS NULL AND (bc.status < ${SqlModelStatus.DEACTIVATED} OR @id IS NOT NULL OR @isAdmin = 1))
            OR (@status IS NOT NULL AND FIND_IN_SET(bc.status, @status))
          )
          AND (@type IS NULL OR (@type IS NOT NULL AND FIND_IN_SET(bc.type, @type)))
        `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT 10 OFFSET 0
      `,
    };

    // LIMIT ${filters.limit} OFFSET ${filters.offset};

    return selectAndCountQuery('mysql', sqlQuery, params, 'bc.id');
  }
}
