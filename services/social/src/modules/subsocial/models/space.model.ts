import {
  ApiName,
  BaseProjectQueryFilter,
  Context,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { DbTables, SocialErrorCode } from '../../../config/types';

import { stringParser } from '@rawmodel/parsers';
import { SocialCodeException } from '../../../lib/exceptions';

export class Space extends UuidSqlModel {
  public readonly tableName = DbTables.SPACE;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.SPACE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public space_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.SPACE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.SPACE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public about: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public image: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public tags: string;

  /**spaceId recieved when space is created on chain */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public spaceId: string;

  public async populateByUuidAndCheckAccess(uuid: string): Promise<this> {
    const space: Space = await this.populateByUUID(uuid, 'space_uuid');

    if (!space.exists()) {
      throw new SocialCodeException({
        code: SocialErrorCode.SPACE_NOT_FOUND,
        status: 404,
      });
    }
    space.canAccess(this.getContext());

    return this;
  }

  public async getList(filter: BaseProjectQueryFilter) {
    this.canAccess(this.getContext());

    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      's',
      {
        id: 's.id',
      },
      filter.serialize(),
    );

    const selectFields = this.generateSelectFields(
      's',
      '',
      this.getContext().apiName == ApiName.ADMIN_CONSOLE_API
        ? SerializeFor.ADMIN_SELECT_DB
        : SerializeFor.SELECT_DB,
    );
    const sqlQuery = {
      qSelect: `
        SELECT ${selectFields}
        `,
      qFrom: `
        FROM \`${DbTables.SPACE}\` s
        WHERE s.project_uuid = IFNULL(@project_uuid, s.project_uuid)
        AND (@search IS null OR s.name LIKE CONCAT('%', @search, '%') OR s.space_uuid = @search)
        AND ((@status IS null AND s.status <> ${SqlModelStatus.DELETED}) OR @status = s.status)
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      's.id',
    );
  }
}
