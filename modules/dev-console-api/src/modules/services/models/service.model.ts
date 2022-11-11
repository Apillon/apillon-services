/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import {
  AdvancedSQLModel,
  getQueryParams,
  PopulateFrom,
  SerializeFor,
} from '@apillon/lib';
import { selectAndCountQuery } from '@apillon/lib';

import { DevConsoleApiContext } from '../../../context';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { ServiceQueryFilter } from '../dtos/services-query-filter.dto';

/**
 * Service model.
 */
export class Service extends AdvancedSQLModel {
  tableName = DbTables.SERVICE;

  /**
   * Service's UUID
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
    ],
    validators: [],
  })
  public service_uuid: string;

  /**
   * Project foreign key
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SERVICE_PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public project_id: number;

  /**
   * Service name
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

  /**
   * Service active / inactive
   */
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
  })
  public active: number;

  /**
   * Returns name, service type, status
   */
  public async getServices(
    context: DevConsoleApiContext,
    filter: ServiceQueryFilter,
  ) {
    // Map url query with sql fields.
    const fieldMap = {
      id: 's.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      's',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT DISTINCT s.name, st.name as "serviceType", s.active,
        TIMEDIFF(NOW(), s.lastStartTime) AS uptime
        `,
      qFrom: `
        FROM \`${DbTables.SERVICE}\` s
        INNER JOIN \`${DbTables.SERVICE_TYPE}\` st
          ON st.id = s.serviceType_id
        WHERE project_id= ${params.project_id} AND s.serviceType_id = ${params.serviceType_id} 
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 's.id');
  }
}
