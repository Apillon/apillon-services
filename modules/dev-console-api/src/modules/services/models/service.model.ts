/* eslint-disable @typescript-eslint/member-ordering */
import { Inject } from '@nestjs/common';
import { prop } from '@rawmodel/core';
import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import { AdvancedSQLModel, PopulateFrom, SerializeFor } from 'at-lib';
import { selectAndCountQuery } from 'at-lib';

import { DevConsoleApiContext } from '../../../context';
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
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
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
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public description: string;

  /**
   * Service status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public status: number;

  /**
   * Service active / inactive
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public active: number;

  /**
   * Returns ids, names and types of active services.
   * @param conn optional connection
   */
  public async getServices(context: DevConsoleApiContext, filter: any) {
    let params = {
      type: filter.type,
      offset: 0,
      limit: 10,
    };

    const sqlQuery = {
      qSelect: `
        select distinct s.name as "service_name" , st.name as "service_type", 
        s.status as status, TIMEDIFF(NOW(), s.lastStartTime) as uptime
        `,
      qFrom: `
        FROM \`${DbTables.SERVICE}\` s
        LEFT JOIN \`${DbTables.SERVICE_TYPE}\` st
          ON st.id = s.serviceType_id
        WHERE st.name = '${params.type}'
      `,
      qFilter: `
        LIMIT ${params.limit} OFFSET ${params.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 's.id');
  }
}
