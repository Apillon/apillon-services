/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser, integerParser, dateParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  ProjectAccessModel,
  env,
  getQueryParams,
  PoolConnection,
  PopulateFrom,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  TrashedFilesQueryFilter,
} from '@apillon/lib';
import {
  DbTables,
  FileStatus,
  ObjectType,
  StorageErrorCode,
} from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import { Bucket } from '../../bucket/models/bucket.model';
import { StorageCodeException } from '../../../lib/exceptions';
import { Directory } from '../../directory/models/directory.model';

export class File extends ProjectAccessModel {
  tableName = DbTables.FILE;

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
    fakeValue: () => uuidV4(),
  })
  public file_uuid: string;

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
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.FILE_CID_NOT_PRESENT,
      },
    ],
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
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
    ],
    validators: [],
  })
  public s3FileKey: string;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.FILE_NAME_NOT_PRESENT,
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
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public contentType: string;

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
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.FILE_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

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
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.FILE_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public bucket_id: number;

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
    ],
    validators: [],
  })
  public directory_id: number;

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
    ],
    validators: [],
  })
  public size: number;

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
      SerializeFor.SELECT_DB,
    ],
    validators: [],
    fakeValue: FileStatus.PINNED_TO_CRUST,
  })
  public fileStatus: number;

  /**
   * Time when file status was set to 8 - MARKED_FOR_DELETION
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
    populatable: [PopulateFrom.DB],
  })
  public markedForDeletionTime?: Date;

  /************************************************************************
  INFO PROPERTIES
  ********************************************************************************/
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
    validators: [],
  })
  public downloadLink: string;

  /**
   * Path without name
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public path: string;

  /**
   * Marks record in the database for deletion.
   */
  public async markForDeletion(conn?: PoolConnection): Promise<this> {
    this.updateUser = this.getContext()?.user?.id;

    this.status = SqlModelStatus.MARKED_FOR_DELETION;
    this.markedForDeletionTime = new Date();

    try {
      await this.update(SerializeFor.UPDATE_DB, conn);
    } catch (err) {
      this.reset();
      throw err;
    }
    return this;
  }

  public async populateByNameAndDirectory(
    bucket_id: number,
    name: string,
    directory_id?: number,
  ): Promise<this> {
    if (!name) {
      throw new Error('name should not be null');
    }

    directory_id = directory_id ? directory_id : null;

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE 
      bucket_id = @bucket_id
      AND name = @name 
      AND ((@directory_id IS NULL AND directory_id IS NULL) OR @directory_id = directory_id)
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { bucket_id, name, directory_id },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  /**
   *
   * @param id internal id, cid or file_uuid
   * @returns
   */
  public async populateById(id: string | number): Promise<this> {
    if (!id) {
      throw new Error('id should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE (id LIKE @id OR cid LIKE @id OR file_uuid LIKE @id)
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { id },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async populateByUUID(file_uuid: string): Promise<this> {
    if (!file_uuid) {
      throw new Error('file_uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.FILE}\`
      WHERE file_uuid = @file_uuid AND status <> ${SqlModelStatus.DELETED};
      `,
      { file_uuid },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async getMarkedForDeletionList(
    context: ServiceContext,
    filter: TrashedFilesQueryFilter,
  ) {
    const b: Bucket = await new Bucket({}, context).populateByUUID(
      filter.bucket_uuid,
    );
    if (!b.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    b.canAccess(context);

    // Map url query with sql fields.
    const fieldMap = {
      id: 'f.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'f',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${ObjectType.FILE} as type, f.id, f.status, f.name, f.CID, f.createTime, f.updateTime, 
        f.contentType as contentType, f.size as size, f.directory_id as parentDirectoryId, 
        f.file_uuid as file_uuid, CONCAT("${env.STORAGE_IPFS_GATEWAY}", f.CID) as link
        `,
      qFrom: `
        FROM \`${DbTables.FILE}\` f
        INNER JOIN \`${DbTables.BUCKET}\` b ON f.bucket_id = b.id
        WHERE b.bucket_uuid = @bucket_uuid
        AND (@search IS null OR f.name LIKE CONCAT('%', @search, '%'))
        AND f.status = ${SqlModelStatus.MARKED_FOR_DELETION}
        `,
      qFilter: `
        ORDER BY ${
          filters.orderStr ? filters.orderStr : 'f.markedForDeletionTime DESC'
        }
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'f.id');
  }

  /**
   * Return array of Files, that are in bucket
   * @param bucket_id
   * @param context
   * @returns
   */
  public async populateFilesInBucket(
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
      for (const d of data) {
        res.push(new File({}, context).populate(d, PopulateFrom.DB));
      }
    }

    return res;
  }

  public populatePath(directories: Directory[]) {
    this.path = '';
    if (!this.directory_id) {
      return;
    } else {
      let tmpDir: Directory = undefined;
      do {
        tmpDir = directories.find(
          (x) =>
            x.id == (tmpDir ? tmpDir.parentDirectory_id : this.directory_id),
        );
        this.path = tmpDir.name + '/' + this.path;
      } while (tmpDir?.parentDirectory_id);
    }
  }
}
