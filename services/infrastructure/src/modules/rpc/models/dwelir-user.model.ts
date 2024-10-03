import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  prop,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';
import { stringParser, booleanParser } from '@rawmodel/parsers';

export class DwellirUser extends AdvancedSQLModel {
  public readonly tableName = DbTables.DWELLIR_USER;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public user_uuid: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public dwellir_id: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public exceeded_monthly_limit: boolean;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public email: string;

  public async populateByDwellirIds(dwellirIds: string[]): Promise<this[]> {
    if (!dwellirIds.length) {
      return [];
    }

    const data = await this.getContext().mysql.paramExecute(
      `SELECT * FROM ${DbTables.DWELLIR_USER} WHERE dwellir_id IN (${dwellirIds.map((id) => `"${id}"`).join(',')})`,
    );

    return data.map((dwellirUser) =>
      this.populate(dwellirUser, PopulateFrom.DB),
    );
  }

  public async populateByUserUuids(userUuids: string[]): Promise<this[]> {
    if (!userUuids.length) {
      return [];
    }

    const data = await this.getContext().mysql.paramExecute(
      `SELECT * FROM ${DbTables.DWELLIR_USER} WHERE user_uuid IN (${userUuids.map((id) => `"${id}"`).join(',')})`,
    );

    return data.map((dwellirUser) =>
      this.populate(dwellirUser, PopulateFrom.DB),
    );
  }

  public async updateManyExceededMonthlyLimit(
    ids: number[],
    value: boolean,
    reverse?: boolean,
  ) {
    if (!ids.length) {
      return;
    }

    await this.getContext().mysql.paramExecute(
      `UPDATE ${DbTables.DWELLIR_USER} SET exceeded_monthly_limit = ${value ? 1 : 0} WHERE id ${reverse ? 'NOT' : ''} IN (${ids.join(',')})`,
    );
  }
}
