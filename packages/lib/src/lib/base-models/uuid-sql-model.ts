import { dateParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  ErrorCode,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
} from '../../config/types';
import { prop } from './advanced-sql.model';
import { ProjectAccessModel } from './project-access.model';

/**
 * Class which contains access control methods for a project.
 * Contains canAccess and canModify methods which check if a project can be accessed and/or modified.
 * @abstract
 * @class ProjectAccessModel
 * @typedef {ProjectAccessModel}
 * @extends {AdvancedSQLModel}
 */
export abstract class UuidSqlModel extends ProjectAccessModel {
  /**
   * id
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
      SerializeFor.LOGGER,
      SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  /**
   * status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.LOGGER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ErrorCode.STATUS_NOT_PRESENT,
      },
    ],
    defaultValue: SqlModelStatus.ACTIVE,
    fakeValue() {
      return SqlModelStatus.ACTIVE;
    },
  })
  public status?: SqlModelStatus;

  /**
   * Created at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
    defaultValue: new Date(),
  })
  public createTime?: Date;

  /**
   * Updated at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public updateTime?: Date;
}
