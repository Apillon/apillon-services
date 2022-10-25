import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  Context,
  getQueryParams,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
  unionSelectAndCountQuery,
} from 'at-lib';
import { v4 as uuidV4 } from 'uuid';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { ServiceContext } from '../../../context';

export class Directory extends AdvancedSQLModel {
  public readonly tableName = DbTables.DIRECTORY;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
    defaultValue: uuidV4(),
    fakeValue: uuidV4(),
  })
  public directory_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public parentDirectory_id: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.DIRECTORY_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public bucket_id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public CID: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.DIRECTORY_NAME_NOT_PRESENT,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public description: string;

  /**
   * Return array of Directories, that are in bucket
   * @param bucket_id
   * @param context
   * @returns
   */
  public async populateDirectoriesInBucket(
    bucket_id: number,
    context: ServiceContext,
  ): Promise<this[]> {
    if (!bucket_id) {
      throw new Error('bucket_id should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE bucket_id = @bucket_id AND status <> ${SqlModelStatus.DELETED};
      `,
      { bucket_id },
    );
    const res = [];
    if (data && data.length) {
      for (const d of data)
        res.push(new Directory({}, context).populate(d, PopulateFrom.DB));
    }

    return res;
  }

  /**
   * Return array of objects (directories) and files, that are in bucket and in specific parent directory
   * @param bucket_id
   * @param parentDirectory_id
   * @returns
   */
  public async getDirectoryContent(bucket_id: number, directory_id?: number) {
    // if (!bucket_id) {
    //   throw new Error('bucket_id should not be null');
    // }
    // directory_id = directory_id ? directory_id : null;
    // const { params, filters } = getQueryParams(
    //   filter.getDefaultValues(),
    //   'pd',
    //   fieldMap,
    //   filter.serialize(),
    // );
    // /*return await this.getContext().mysql.paramExecute(
    //   `
    //   SELECT d.name, d.CID, d.createTime, d.updateTime
    //   FROM \`${DbTables.DIRECTORY}\` d
    //   WHERE d.bucket_id = @bucket_id
    //   AND IFNULL(@directory_id, -1) = IFNULL(directory_id, -1)
    //   AND status <> ${SqlModelStatus.DELETED}
    //   UNION ALL
    //   SELECT d.name, d.CID, d.createTime, d.updateTime
    //   FROM \`${DbTables.FILE}\` f
    //   WHERE d.bucket_id = @bucket_id
    //   AND IFNULL(@directory_id, -1) = IFNULL(directory_id, -1)
    //   AND status <> ${SqlModelStatus.DELETED}
    //   `,
    //   { bucket_id, directory_id },
    // );*/
    // const qSelects = [
    //   {
    //     qSelect: `
    //     SELECT d.name, d.CID, d.createTime, d.updateTime
    //     `,
    //     qFrom: `
    //     FROM \`${DbTables.DIRECTORY}\` d
    //   `,
    //   },
    // ];
    // return unionSelectAndCountQuery(context.mysql, { qSelects: qSelects });
  }

  /*public async getList(context: ServiceContext, query: BucketQueryFilter) {
    const params = {
      project_uuid: query.project_uuid,
      search: query.search,
    };

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('b', '')}
        `,
      qFrom: `
        FROM \`${DbTables.BUCKET}\` b
        WHERE (@search IS null OR b.name LIKE CONCAT('%', @search, '%'))
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'b.id');
  }*/
}
