import {
  BaseSQLModel,
  PopulateFrom,
  SerializeFor,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { booleanParser, stringParser, integerParser } from '@rawmodel/parsers';
import { DbTables, ReferralErrorCode } from '../../../config/types';

export class UserAirdropTask extends BaseSQLModel {
  public readonly tableName = DbTables.USER_AIRDROP_TASK;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.USER_UUID_NOT_PRESENT,
      },
    ],
  })
  public user_uuid: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public projectCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public bucketCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public fileUploaded: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public websiteCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public ipnsCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public onSubscriptionPlan: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public creditsPurchased: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public grillChatCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public nftCollectionCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public domainLinked: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public websiteUploadedViaApi: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public fileUploadedViaApi: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public computingContractCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public collaboratorAdded: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public kiltIdentityCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public identitySdkUsed: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public nftMintedApi: boolean;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: 0,
  })
  public usersReferred: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: 0,
  })
  public creditsSpent: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: 0,
  })
  public totalPoints: number;

  exists(): boolean {
    return !!this.user_uuid;
  }

  public async populateByUserUuid(user_uuid: string) {
    if (!user_uuid) {
      throw new Error('user_uuid should not be null');
    }
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.USER_AIRDROP_TASK}\`
        WHERE user_uuid = @user_uuid LIMIT 1;
      `,
      { user_uuid },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async insertOrUpdate(): Promise<void> {
    const serializedData = this.serialize(SerializeFor.INSERT_DB);

    const updateFields = Object.keys(serializedData)
      .map((key) => `${key} = @${key}`)
      .join(', ');

    const query = `
      INSERT INTO \`${DbTables.USER_AIRDROP_TASK}\` SET ${updateFields}
      ON DUPLICATE KEY UPDATE ${updateFields};
    `;

    await this.getContext().mysql.paramExecute(query, serializedData);
  }
}
