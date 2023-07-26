import {
  AdvancedSQLModel,
  PopulateFrom,
  prop,
  SerializeFor,
} from '@apillon/lib';
import {
  stringParser,
  integerParser,
  dateParser,
  booleanParser,
} from '@rawmodel/parsers';
import { DbTables } from '../../../config/types';

export class Terms extends AdvancedSQLModel {
  public readonly tableName = DbTables.TERMS;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    // fakeValue: () => {
    //   return `Terms ${Math.floor(Math.random() * 1000)}`;
    // },
  })
  public title: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public type: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public text: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public url: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public validFrom: Date;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public isRequired: boolean;
}
