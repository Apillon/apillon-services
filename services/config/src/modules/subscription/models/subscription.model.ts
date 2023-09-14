import { dateParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  enumInclusionValidator,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SubscriptionPackage,
} from '@apillon/lib';
import { ConfigErrorCode, DbTables } from '../../../config/types';

export class Subscription extends AdvancedSQLModel {
  public readonly tableName = DbTables.SUBSCRIPTION;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.SUBSCRIPTION_ID_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(SubscriptionPackage, true),
        code: ConfigErrorCode.SUBSCRIPTION_ID_NOT_VALID,
      },
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public package_id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public project_uuid: number;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public expiresOn: Date;
}
