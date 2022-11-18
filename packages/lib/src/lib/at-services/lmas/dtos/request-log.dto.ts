// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import { v4 as uuid } from 'uuid';

export class RequestLogDto extends ModelBase {
  /**
   * Request ID.
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.ADMIN],
    fakeValue: uuid(),
  })
  public requestId: string;

  /**
   * API name
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.ADMIN],
    fakeValue: uuid(),
  })
  public apiName: string;

  /**
   * Host name
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
    ],
    fakeValue: 'localhost',
  })
  public host: string;

  /**
   * IP address.
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
    ],
    fakeValue: '127.0.0.1',
  })
  public ip: string;

  /**
   * Http response status (200).
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
    ],
    fakeValue: 200,
  })
  public status: number;

  /**
   * Http method used (GET).
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
    ],
    fakeValue: 'GET',
  })
  public method: string;

  /**
   * Full request url (/profile/auth?query=true).
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
    ],
    fakeValue: '/profile/auth',
  })
  public url: string;

  /**
   * Api endpoint (/profile/auth).
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
    ],
    fakeValue: '/profile/auth',
  })
  public endpoint: string;

  /**
   * User agent (Chrome 54.0.2840 / Mac OS X 10.11.6).
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
    ],
    fakeValue: 'Chrome 54.0.2840',
  })
  public userAgent: string;

  /**
   * Body data (POST / PUT).
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
    ],
    fakeValue: JSON.stringify({ foo: 'bar' }),
  })
  public body: string;

  /**
   * Response time (10ms).
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.ADMIN, SerializeFor.INSERT_DB],
    fakeValue: 0,
  })
  public responseTime: number;

  /**
   * Created at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.ADMIN],
    fakeValue: new Date(),
  })
  public createTime: Date;

  /**
   * User id
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.ADMIN, SerializeFor.INSERT_DB],
  })
  public user_uuid: string;
}
