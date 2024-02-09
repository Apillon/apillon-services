import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { booleanParser, stringParser, integerParser } from '@rawmodel/parsers';
import { DbTables, ReferralErrorCode } from '../../../config/types';

export class AirdropTask extends AdvancedSQLModel {
  public readonly tableName = DbTables.AIRDROP_TASK;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
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
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public projectCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public bucketCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public fileUploaded: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public websiteCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public ipnsCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public onSubscriptionPlan: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public creditsPurchased: boolean;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public creditsSpent: number;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public grillChatCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public nftCollectionCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public domainLinked: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public websiteUploadedApi: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public fileUploadedApi: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public computingContractCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public collaboratorAdded: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public kiltIdentityCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public identitySdkUsed: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public nftMintedApi: boolean;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public usersReferred: number;

  public async populateByUserUuid(user_uuid: string) {
    if (!user_uuid) {
      throw new Error('user_uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `SELECT * FROM \`${this.tableName}\` WHERE user_uuid = @user_uuid LIMIT 1;`,
      { user_uuid },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
