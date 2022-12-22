import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
} from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { DbTables } from '../../../config/types';
import { faker } from '@faker-js/faker';

export class OauthTokenPair extends AdvancedSQLModel {
  tableName = DbTables.OAUTH_TOKEN_PAIR;

  /**
   * Twitter oauth token
   */
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
    ],
    validators: [],
    fakeValue() {
      return faker.internet.userName();
    },
  })
  public oauth_token: string;

  /**
   * Twitter oauth token secret
   */
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
    ],
    validators: [],
    fakeValue() {
      return faker.internet.userName();
    },
  })
  public oauth_secret: string;

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
    ],
    validators: [],
    fakeValue() {
      return faker.internet.userName();
    },
  })
  public url: string;

  public constructor(data?: any, context?: Context) {
    super(data, context);
  }

  public async populateByToken(token: string) {
    const data = await this.db().paramExecute(
      `
      SELECT * FROM ${this.tableName}
      WHERE oauth_token = @token
    `,
      { token },
    );

    if (data && data.length) {
      this.populate(data[0], PopulateFrom.DB);
      return this;
    }
    return this.reset();
  }
}
