/* eslint-disable @typescript-eslint/member-ordering */
import {
  FilesQueryFilter,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
  getQueryParams,
  selectAndCountQuery,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { prop } from '@rawmodel/core';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { v4 as uuidV4 } from 'uuid';
import { DbTables, FileStatus, StorageErrorCode } from '../../../config/types';
import { Bucket } from '../../bucket/models/bucket.model';
import { ProjectConfig } from '../../config/models/project-config.model';

export class File extends UuidSqlModel {
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
      SerializeFor.APILLON_API,
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
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
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
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
  })
  public CIDv1: string;

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
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
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
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
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
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public path: string;

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
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
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
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
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
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public link: string;

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
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public directory_uuid: string;

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
      SELECT f.*, d.directory_uuid
      FROM \`${DbTables.FILE}\` f
      LEFT JOIN \`${DbTables.DIRECTORY}\` d on d.id = f.directory_id
      WHERE
      f.bucket_id = @bucket_id
      AND f.name = @name
      AND ((@directory_id IS NULL AND f.directory_id IS NULL) OR @directory_id = f.directory_id)
      AND f.status <> ${SqlModelStatus.DELETED};
      `,
      { bucket_id, name, directory_id },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  /**
   *
   * @param id internal id, cid or file_uuid
   * @returns
   */
  public override async populateById(id: string | number): Promise<this> {
    if (!id) {
      throw new Error('id should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT f.*, d.directory_uuid
      FROM \`${DbTables.FILE}\` f
      LEFT JOIN \`${DbTables.DIRECTORY}\` d on d.id = f.directory_id
      WHERE (f.id LIKE @id OR f.cid LIKE @id OR f.file_uuid LIKE @id)
      AND f.status <> ${SqlModelStatus.DELETED};
      `,
      { id },
    );

    data?.length ? this.populate(data[0], PopulateFrom.DB) : this.reset();
    await this.populateLink();

    return this;
  }

  /**
   * Populate file which has status 8 or 9 (MARKED_FOR_DELETION or DELETED) and matches query
   * @param id id, cid or uuid
   * @returns
   */
  public async populateDeletedById(id: string | number): Promise<this> {
    if (!id) {
      throw new Error('id should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT f.*, d.directory_uuid
      FROM \`${DbTables.FILE}\` f
      LEFT JOIN \`${DbTables.DIRECTORY}\` d on d.id = f.directory_id
      WHERE (f.id LIKE @id OR f.cid LIKE @id OR f.file_uuid LIKE @id)
      AND f.status IN (${SqlModelStatus.DELETED}, ${SqlModelStatus.MARKED_FOR_DELETION});
      `,
      { id },
    );

    data?.length ? this.populate(data[0], PopulateFrom.DB) : this.reset();
    await this.populateLink();

    return this;
  }

  public override async populateByUUID(uuid: string): Promise<this> {
    return this.populateById(uuid);
  }

  public async populateLink() {
    if (!this.CID) {
      return;
    }

    //Get IPFS cluster
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: this.project_uuid },
      this.getContext(),
    ).getIpfsCluster();

    this.link = ipfsCluster.generateLink(this.project_uuid, this.CID);
  }

  public async listFiles(context: ServiceContext, filter: FilesQueryFilter) {
    const b: Bucket = await new Bucket(
      {},
      context,
    ).populateByUuidAndCheckAccess(filter.bucket_uuid);

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

    //Get IPFS cluster
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: b.project_uuid },
      this.getContext(),
    ).getIpfsCluster();

    const defaultOrderStr =
      filter.status == SqlModelStatus.ACTIVE
        ? 'f.createTime DESC'
        : 'f.markedForDeletionTime DESC';

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('f')}
        `,
      qFrom: `
        FROM \`${DbTables.FILE}\` f
        INNER JOIN \`${DbTables.BUCKET}\` b ON f.bucket_id = b.id
        WHERE b.bucket_uuid = @bucket_uuid
        AND (@search IS null OR CONCAT(IFNULL(f.path, ""), f.name) LIKE CONCAT('%', @search, '%'))
        AND (@fileStatus IS NULL OR f.fileStatus = @fileStatus)
        AND f.status = @status
        `,
      qFilter: `
        ORDER BY ${filters.orderStr || defaultOrderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    const data = await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      params,
      'f.id',
    );

    //Populate link
    for (const item of data.items) {
      if (item.CID) {
        item.link = ipfsCluster.generateLink(b.project_uuid, item.CID);
      }
    }

    return data;
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
      FROM \`${DbTables.FILE}\`
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

  /**
   * Get all files for project
   * @param project_uuid
   * @returns array of files
   */
  public async populateFilesForProject(project_uuid: string): Promise<this[]> {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.FILE}\`
      WHERE project_uuid = @project_uuid 
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid },
    );
    const res = [];
    if (data && data.length) {
      for (const d of data) {
        res.push(new File({}, this.getContext()).populate(d, PopulateFrom.DB));
      }
    }
    return res;
  }

  /**
   * Update status of all project files to BLOCKED
   * @param project_uuid
   * @returns
   */
  public async blockFilesForProject(project_uuid: string): Promise<boolean> {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    await this.getContext().mysql.paramExecute(
      `
    INSERT INTO \`${DbTables.BLACKLIST}\` (cid)
    SELECT f.CID
    FROM \`${DbTables.FILE}\` f
    WHERE f.project_uuid = @project_uuid 
    AND f.status NOT IN (${SqlModelStatus.DELETED}, ${SqlModelStatus.BLOCKED})
    `,
      { project_uuid },
    );

    await this.getContext().mysql.paramExecute(
      `
    UPDATE \`${DbTables.FILE}\`
    SET status = ${SqlModelStatus.BLOCKED}
    WHERE project_uuid = @project_uuid 
    AND status NOT IN (${SqlModelStatus.DELETED}, ${SqlModelStatus.BLOCKED})
    `,
      { project_uuid },
    );
    return true;
  }
}
