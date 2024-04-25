import {
  Context,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
  getQueryParams,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { booleanParser, stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  DbTables,
  PrepareCollectionMetadataStep,
  StorageErrorCode,
} from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { CollectionMetadataQueryFilter } from '../../../../../../packages/lib/dist';

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
      SerializeFor.SELECT_DB,
    ],
  })
  public lastError: string;

  public async getList(
    context: ServiceContext,
    filter: CollectionMetadataQueryFilter,
  ) {
    // Map url query with sql fields.
    const fieldMap = {
      id: 'cm.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'cm',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
          SELECT ${this.generateSelectFields('cm', '')},
          cm.createTime, cm.updateTime
          `,
      qFrom: `
          FROM \`${DbTables.COLLECTION_METADATA}\` cm
          WHERE cm.collection_uuid = @collection_uuid
          AND cm.status <> ${SqlModelStatus.DELETED}
        `,
      qFilter: `
          ORDER BY cm.createTime DESC
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
    };

    const data = await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      params,
      'cm.id',
    );

    return data;
  }
}
