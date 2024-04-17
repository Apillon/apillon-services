import {
  Context,
  PopulateFrom,
  SerializeFor,
  UuidSqlModel,
  prop,
} from '@apillon/lib';
import { booleanParser, stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  DbTables,
  PrepareCollectionMetadataStep,
  StorageErrorCode,
} from '../../../config/types';

export class CollectionMetadata extends UuidSqlModel {
  public readonly tableName = DbTables.COLLECTION_METADATA;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.COLLECTION_METADATA_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public collection_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.COLLECTION_METADATA_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public bucket_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.COLLECTION_METADATA_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public imagesSession: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.COLLECTION_METADATA_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public metadataSession: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.COLLECTION_METADATA_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    defaultValue: true,
    fakeValue: true,
  })
  public useApillonIpfsGateway: boolean;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
  })
  public ipnsId: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.COLLECTION_METADATA_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    defaultValue: PrepareCollectionMetadataStep.UPLOAD_IMAGES_TO_IPFS,
    fakeValue: PrepareCollectionMetadataStep.UPLOAD_IMAGES_TO_IPFS,
  })
  public currentStep: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
  })
  public lastError: string;

  /*public async getList(context: ServiceContext, filter: IpnsQueryFilter) {
    const b: Bucket = await new Bucket({}, context).populateByUUID(
      filter.bucket_uuid,
    );
    if (!b.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    this.project_uuid = b.project_uuid;

    this.canAccess(context);

    //Get IPFS-->IPNS gateway
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: this.project_uuid },
      this.getContext(),
    ).getIpfsCluster();

    // Map url query with sql fields.
    const fieldMap = {
      id: 'b.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'i',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
          SELECT ${this.generateSelectFields('i', '')},
          i.updateTime
          `,
      qFrom: `
          FROM \`${DbTables.IPNS}\` i
          JOIN \`${DbTables.BUCKET}\` b on b.id = i.bucket_id
          WHERE b.bucket_uuid = @bucket_uuid
          AND (@search IS null OR i.name LIKE CONCAT('%', @search, '%'))
          AND (@ipnsName IS null OR i.ipnsName LIKE CONCAT('%', @ipnsName, '%'))
          AND (@ipnsValue IS null OR i.ipnsValue LIKE CONCAT('%', @ipnsValue, '%'))
          AND i.status <> ${SqlModelStatus.DELETED}
        `,
      qFilter: `
          ORDER BY ${filters.orderStr}
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
    };

    const data = await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      { ...params, project_uuid: this.project_uuid },
      'i.id',
    );

    for (const item of data.items) {
      if (item.ipnsName) {
        item.link = ipfsCluster.generateLink(
          b.project_uuid,
          item.ipnsName,
          true,
        );
      }
    }

    return data;
  }*/
}
