/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  CodeException,
  getQueryParams,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  DefaultUserRole,
  ForbiddenErrorCodes,
  AdvancedSQLModel,
  selectAndCountQuery,
  getFaker,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../../context';
import {
  DbTables,
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../../config/types';
import { ServiceQueryFilter } from '../dtos/services-query-filter.dto';
import { Project } from '../../project/models/project.model';
import { HttpStatus } from '@nestjs/common';

/**
 * Service model.
 */
export class Service extends AdvancedSQLModel {
  tableName = DbTables.SERVICE;

  @prop({
    parser: { resolver: integerParser() },
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

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
    fakeValue: () => getFaker().word.verb(),
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
    // Admins are allowed to access items on any project
    if (context.user?.userRoles.includes(DefaultUserRole.ADMIN)) {
      return true;
    }

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
        status: 403,
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
        status: 403,
        errorMessage: 'Insufficient permissions to modify this record',
      });
    }
    return true;
  }

  public override async populateByUUID(uuid: string): Promise<this> {
    return super.populateByUUID(uuid, 'service_uuid');
  }

  /**
   * Returns name, service type, status
   */
  public async getServices(
    context: DevConsoleApiContext,
    filter: ServiceQueryFilter,
  ) {
    await new Project({}, context).populateByUUIDOrThrow(filter.project_uuid);

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
        INNER JOIN \`${DbTables.PROJECT}\` p
          ON p.id = s.project_id
        WHERE p.project_uuid = @project_uuid
        AND (@serviceType_id IS NULL OR  s.serviceType_id = @serviceType_id)
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 's.id');
  }
}
