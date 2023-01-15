/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

import {
  AdvancedSQLModel,
  CodeException,
  DefaultUserRole,
  ForbiddenErrorCodes,
  getQueryParams,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { selectAndCountQuery } from '@apillon/lib';

import { DevConsoleApiContext } from '../../../context';
import {
  DbTables,
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../../config/types';
import { ServiceQueryFilter } from '../dtos/services-query-filter.dto';
import { faker } from '@faker-js/faker';
import { Project } from '../../project/models/project.model';
import { HttpStatus } from '@nestjs/common';

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
      SerializeFor.SELECT_DB,
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
    fakeValue: faker.word.verb(),
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
    fakeValue: 1,
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
   * ASYNCHROUNUOS method, to check roles for access to record
   * @param context
   */
  public async canAccess(context: DevConsoleApiContext) {
    const project = await new Project({}, context).populateById(
      this.project_id,
    );
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_USER,
          DefaultUserRole.ADMIN,
        ],
        project.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }
  }
  /**
   * ASYNCHROUNUOS method, to check roles for modifying this record
   * @param context
   */
  public async canModify(context: DevConsoleApiContext) {
    const project = await new Project({}, context).populateById(
      this.project_id,
    );
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.ADMIN,
        ],
        project.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions to modify this record',
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
      WHERE service_uuid = @uuid AND status <> ${SqlModelStatus.DELETED};
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
   * Returns name, service type, status
   */
  public async getServices(
    context: DevConsoleApiContext,
    filter: ServiceQueryFilter,
  ) {
    const project: Project = await new Project({}, context).populateById(
      filter.project_id,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    project.canAccess(context);

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
        SELECT ${this.generateSelectFields(
          's',
          '',
          SerializeFor.SELECT_DB,
        )}, st.name as "serviceType"
        `,
      qFrom: `
        FROM \`${DbTables.SERVICE}\` s
        INNER JOIN \`${DbTables.SERVICE_TYPE}\` st
          ON st.id = s.serviceType_id
        WHERE project_id= @project_id
        AND (@serviceType_id IS NULL OR  s.serviceType_id = @serviceType_id )
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 's.id');
  }
}
