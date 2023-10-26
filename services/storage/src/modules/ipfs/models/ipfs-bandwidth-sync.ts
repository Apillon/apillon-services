import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  prop,
} from '@apillon/lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables } from '../../../config/types';

export class IpfsBandwidthSync extends AdvancedSQLModel {
  public readonly tableName = DbTables.IPFS_BANDWIDTH_SYNC;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public ipfsTrafficFrom: Date;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public ipfsTrafficTo: Date;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public message: number;
}
