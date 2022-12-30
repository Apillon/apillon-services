import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  Context,
  JSONParser,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables, ReferralErrorCode } from '../../../config/types';
import { Task, TaskType } from './task.model';
import { Realization } from './realization.model';
import { faker } from '@faker-js/faker';

export class Player extends AdvancedSQLModel {
  public readonly tableName = DbTables.PLAYER;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

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
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.DEFAULT_VALIDATION_ERROR,
      },
    ],
  })
  public user_uuid: string;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.DEFAULT_VALIDATION_ERROR,
      },
    ],
    fakeValue: () => faker.random.alphaNumeric(5),
  })
  public refCode: string;

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
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public twitter_id: string;

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
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public github_id: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public referrer_id: number;

  @prop({
    parser: { resolver: JSONParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public shippingInfo: any;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public termsAccepted: Date;

  @prop({
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.PROFILE],
    validators: [],
  })
  public tasks: any;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.PROFILE],
    validators: [],
  })
  public balance: number;

  /**
   * Populates model fields by loading the document with the provided user id from the database.
   * @param user_id Referr's user ID.
   */
  public async populateByUserUuid(
    user_uuid: number | string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!user_uuid) {
      throw new Error('User UUID should not be null');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.PLAYER}\`
      WHERE user_uuid = @user_uuid AND status <> ${SqlModelStatus.DELETED};
      `,
      { user_uuid },
      conn,
    );

    if (data && data.length) {
      this.populate(data[0], PopulateFrom.DB);
      return this;
    } else {
      return this.reset();
    }
  }

  public async populateSubmodels() {
    if (this.exists()) {
      await this.populateTasks();
      await this.getBalance();
    }
    return this;
  }

  /**
   * Populates model fields by loading the document with the provided user id from the database.
   * @param user_id Referr's user ID.
   */
  public async populateByTwitterId(
    id: number | string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!id) {
      throw new Error('Twitter id should not be null');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.PLAYER}\`
      WHERE twitter_id = @id AND status <> ${SqlModelStatus.DELETED};
      `,
      { id },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  /**
   * Populates model fields by loading the document with the provided user id from the database.
   * @param user_id Referr's user ID.
   */
  public async populateByRefCode(
    refCode: string,
    showDeleted = false,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!refCode) {
      throw new Error('User UUID should not be null');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.PLAYER}\`
      WHERE refCode = @refCode 
      ${showDeleted ? '' : `AND status <> ${SqlModelStatus.DELETED}`};
      `,
      { refCode, showDeleted },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async populateTasks() {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT 
      ${new Task({}, null).generateSelectFields('t')},
      IF(r.id IS NOT NULL,
        JSON_ARRAYAGG(
          JSON_OBJECT(${new Realization({}, null).generateSelectJSONFields(
            'r',
          )})
        ), 
        JSON_ARRAY()
      ) as realizations
      FROM \`${DbTables.TASK}\` t
      LEFT JOIN \`${DbTables.REALIZATION}\` r
        ON r.player_id = @player_id
        AND r.task_id = t.id
        AND r.status = ${SqlModelStatus.ACTIVE}
      GROUP BY t.id, r.id
      `,
      { player_id: this.id },
    );

    if (data.length) {
      this.tasks = data;
    }
    return data;
  }

  public async getBalance() {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT 
        player_id,
        balance
      FROM \`${DbTables.BALANCE}\` b
      WHERE b.player_id = @player_id
      `,
      { player_id: this.id },
    );

    if (data.length) {
      this.balance = data[0].balance;
    } else {
      this.balance = 0;
    }
    return this.balance;
  }

  public async confirmRefer(referred_id: number) {
    const task = await new Task({}, this.getContext()).populateByType(
      TaskType.REFERRAL,
    );

    await task.confirmTask(this.id, { referred_id }, true);
  }

  public async generateCode() {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    let result = '';
    while (!result.length) {
      const charactersLength = characters.length;
      // generate 5 length code
      for (let i = 0; i < 5; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength),
        );
      }
      const r = await new Player({}, this.getContext()).populateByRefCode(
        result,
        true,
      );
      if (r.exists()) {
        result = '';
      }
    }

    return result;
  }
}
