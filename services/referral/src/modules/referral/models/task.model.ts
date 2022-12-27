import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  Context,
  JSONParser,
  PoolConnection,
  PopulateFrom,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import {
  DbTables,
  ReferralErrorCode,
  TransactionDirection,
} from '../../../config/types';
import { ServiceContext } from '../../../context';
import { Realization } from './realization.model';
import { ReferralValidationException } from '../../../lib/exceptions';
import { faker } from '@faker-js/faker';

export enum TaskType {
  REFERRAL = 1,
  TWITTER_CONNECT = 2,
  GITHUB_CONNECT = 3,
  TWITTER_RETWEET = 4,
}

export class Task extends AdvancedSQLModel {
  public readonly tableName = DbTables.TASK;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

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
  public type: number;

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
    fakeValue: () => faker.random.word(),
  })
  public name: string;

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
    fakeValue: () => faker.random.words(6),
  })
  public description: string;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    defaultValue: 1,
    fakeValue: 1,
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.DEFAULT_VALIDATION_ERROR,
      },
    ],
  })
  public reward: number;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    defaultValue: 1,
    fakeValue: 1,
    validators: [],
  })
  public maxCompleted: number;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    fakeValue: new Date(),
    validators: [],
  })
  public activeFrom: Date;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    fakeValue: faker.date.future(1),
    validators: [],
  })
  public activeTo: Date;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public data: any;

  public async populateByType(
    type: TaskType,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!type) {
      throw new Error('Type should not be null');
    }
    this.reset();
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.TASK}\`
      WHERE type = @type
      AND status <> ${SqlModelStatus.DELETED}
      `,
      { type },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async getList(context: ServiceContext) {
    const params = {};

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('t', '')}
        `,
      qFrom: `
        FROM \`${DbTables.TASK}\` t
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 't.id');
  }

  public async confirmTask(player_id: number, data?: any) {
    if (!this.exists()) {
      //
    }

    const existingR = await new Realization(
      {},
      this.getContext(),
    ).populateByTaskIdAndPlayerId(this.id, player_id, data);

    if (existingR.length >= this.maxCompleted) {
      // already completed
    }

    const realization = new Realization({}, this.getContext()).populate({
      data,
      task_id: this.id,
      reward: this.reward,
      player_id,
    });

    try {
      await realization.validate();
    } catch (err) {
      await realization.handle(err);
      if (!realization.isValid())
        throw new ReferralValidationException(realization);
    }

    await realization.insert();

    await this.db().paramExecute(
      `
	          INSERT INTO ${DbTables.TRANSACTION}
	            (player_id, direction, amount, realization_id, status)
	          VALUES 
              (@player_id, ${TransactionDirection.DEPOSIT}, @reward ,@realization_id, ${SqlModelStatus.ACTIVE})
	        `,
      { player_id, reward: this.reward, realization_id: realization?.id },
    );
  }
}
