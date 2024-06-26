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
  getFaker,
  generateRandomCode,
} from '@apillon/lib';
import { DbTables, ReferralErrorCode } from '../../../config/types';
import { Task, TaskType } from './task.model';
import { Realization } from './realization.model';

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
        code: ReferralErrorCode.USER_UUID_NOT_PRESENT,
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
        code: ReferralErrorCode.USER_EMAIL_NOT_PRESENT,
      },
    ],
  })
  public userEmail: string;

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
        code: ReferralErrorCode.REFERRAL_CODE_NOT_PRESENT,
      },
    ],
    fakeValue: () => getFaker().random.alphaNumeric(5),
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
  public twitter_name: string;

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
  public github_name: string;

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

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.PROFILE],
    validators: [],
  })
  public balance_all: number;

  @prop({
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.PROFILE],
    validators: [],
  })
  // Offers autocomplete for existing fields of Player model,
  // with ability to pass in other arbitrary fields because of custom SQL query fields
  public referrals: (this & { [x: string]: any })[];

  /**
   * Populates model fields by loading the document with the provided user id from the database.
   * @param user_uuid Player's user UUID.
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

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateSubmodels() {
    if (this.exists()) {
      await this.populateTasks();
      await this.getBalance();
      await this.getReferredUsers();
    }
    return this;
  }

  /**
   * Populates model fields by loading the document with the provided user id from the database.
   * @param id Player's Twitter ID.
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

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  /**
   * Populates model fields by loading the document with the provided user id from the database.
   * @param id Player's Github ID.
   */
  public async populateByGithubId(
    id: number | string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!id) {
      throw new Error('Github id should not be null');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.PLAYER}\`
      WHERE github_id = @id AND status <> ${SqlModelStatus.DELETED};
      `,
      { id },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
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

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
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
      ) AS realizations
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
        balance,
        all_time
      FROM \`${DbTables.BALANCE}\` b
      WHERE b.player_id = @player_id
      `,
      { player_id: this.id },
    );

    if (data.length) {
      this.balance = data[0].balance;
      this.balance_all = data[0].all_time;
    } else {
      this.balance = 0;
      this.balance_all = 0;
    }
    return this.balance;
  }

  public async getReferredUsers() {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT
        CONCAT(
          LEFT(SUBSTRING_INDEX(ref.userEmail,'@',1),1),
          REPEAT('*', 4),
          RIGHT(SUBSTRING_INDEX(ref.userEmail,'@',1),1),
          '@',
          SUBSTRING_INDEX(ref.userEmail,'@',-1)
        ) AS name,
        IF(ref.github_id, 1, 0) AS has_github,
        ref.createTime AS joined,
        ref.user_uuid,
        IF(uat.totalPoints >= 15, 1, 0) AS active
      FROM ${DbTables.PLAYER} ref
      LEFT JOIN ${DbTables.USER_AIRDROP_TASK} uat ON ref.user_uuid = uat.user_uuid
      WHERE ref.referrer_id = @player_id
      GROUP BY ref.id;
      `,
      { player_id: this.id },
    );

    this.referrals = data.length ? data : [];
    return this.referrals;
  }

  public async confirmRefer(referred_id: number, conn?: PoolConnection) {
    const task = await new Task({}, this.getContext()).populateByType(
      TaskType.REFERRAL,
      conn,
    );

    await task.confirmTask(this.id, { referred_id }, true, conn);
  }

  public async generateCode() {
    let result = '';
    while (!result.length) {
      // generate 5 length code
      result = generateRandomCode(
        5,
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      );
      const player = await new Player({}, this.getContext()).populateByRefCode(
        result,
        true,
      );
      if (player.exists()) {
        result = '';
      }
    }

    return result;
  }
}
