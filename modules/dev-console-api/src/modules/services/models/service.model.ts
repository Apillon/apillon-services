/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import { AdvancedSQLModel, PopulateFrom, SerializeFor } from 'at-lib';
import { selectAndCountQuery } from 'at-lib';

import { DevConsoleApiContext } from '../../../context';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { ServiceQueryFilter } from '../dtos/services-query-filter.dto';

import { v4 as uuidv4 } from 'uuid';

/**
 * Service model.
 */
export class Service extends AdvancedSQLModel {
  collectionName = DbTables.SERVICE;

  /**
   * Service's UUID
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SERVICE_UUID_NOT_PRESENT,
      },
    ],
    defaultValue: uuidv4(),
    fakeValue: uuidv4(),
  })
  public service_uuid: string;

  /**
   * Project foreign key
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
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
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
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
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
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
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public description: string;

  /**
   * Service active / inactive
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
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
    const params = {
      serviceType_id: filter.serviceType_id,
      project_id: filter.project_id,
      offset: 0,
      limit: 10,
    };

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
        LIMIT ${params.limit} OFFSET ${params.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 's.id');
  }
}
