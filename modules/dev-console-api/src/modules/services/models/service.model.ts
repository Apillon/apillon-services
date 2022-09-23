/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import { AdvancedSQLModel, PopulateFrom, SerializeFor } from 'at-lib';
import { selectAndCountQuery } from 'at-lib';

import { DevConsoleApiContext } from '../../../context';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { ServiceQueryFilter } from '../dtos/services-query-filter.dto';

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
    serializable: [PopulateFrom.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
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
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
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
    serializable: [PopulateFrom.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public description: string;

  /**
   * Service status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [PopulateFrom.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public status: number;

  /**
   * Service active / inactive
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [PopulateFrom.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public active: number;

  /**
   * Service active / inactive
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public project_id: number;

  /**
   * Returns name, service type, status
   */
  public async getServices(context: DevConsoleApiContext, filter: ServiceQueryFilter) {
    let params = {
      type: filter.type,
      project_id: filter.project_id,
      offset: 0,
      limit: 10,
    };

    const sqlQuery = {
      qSelect: `
        SELECT DISTINCT s.name AS "service_name", st.name as "service_type", 
        s.status AS status, TIMEDIFF(NOW(), s.lastStartTime) AS uptime
        `,
      qFrom: `
        FROM \`${DbTables.SERVICE}\` s
        LEFT JOIN \`${DbTables.SERVICE_TYPE}\` st
          ON st.id = s.serviceType_id
        WHERE project_id= ${params.project_id} AND st.name = '${params.type}' 
      `,
      qFilter: `
        LIMIT ${params.limit} OFFSET ${params.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 's.id');
  }
}
