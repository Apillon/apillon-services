import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { DbTables, ReferralErrorCode } from '../../../config/types';
import { integerParser, stringParser } from '@rawmodel/parsers';

export class ProductHuntComment extends AdvancedSQLModel {
  public readonly tableName = DbTables.PRODUCT_HUNT_COMMENT;

  public constructor(data: any, context: any) {
    super(data, context);
  }

  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
      SerializeFor.LOGGER,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.PRODUCT_HUNT_COMMENT_USERNAME_NOT_PRESENT,
      },
    ],
  })
  username: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.PRODUCT_HUNT_COMMENT_URL_NOT_PRESENT,
      },
    ],
  })
  url: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.PRODUCT_HUNT_COMMENT_USER_UUID_NOT_PRESENT,
      },
    ],
  })
  public user_uuid: number;

  public async populateForUser(): Promise<this> {
    const context = this.getContext();
    const userUuid = context.user.user_uuid;
    if (!userUuid) {
      return this;
    }

    const data = await context.mysql.paramExecute(`
    SELECT * FROM ${DbTables.PRODUCT_HUNT_COMMENT} WHERE user_uuid = "${userUuid}"`);

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
