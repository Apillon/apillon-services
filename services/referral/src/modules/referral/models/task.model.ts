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
import {
  DbTables,
  ReferralErrorCode,
  TransactionDirection,
} from '../../../config/types';
import { Realization } from './realization.model';
import {
  ReferralCodeException,
  ReferralValidationException,
} from '../../../lib/exceptions';

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
        code: ReferralErrorCode.TASK_TYPE_NOT_PRESENT,
      },
    ],
  })
  public type: TaskType;

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
        code: ReferralErrorCode.REWARD_NOT_PRESENT,
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

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async confirmTask(
    player_id: number,
    data?: any,
    filterByData = false,
    conn?: PoolConnection,
  ) {
    if (!this.exists()) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.TASK_DOES_NOT_EXISTS,
        status: 400,
      });
    }

    const existingR = await new Realization(
      {},
      this.getContext(),
    ).getRealizationsByTaskIdAndPlayerId(
      this.id,
      player_id,
      filterByData ? data : null,
      false,
      conn,
    );

    // task has reached limit of realizations || task already has realization with the same data
    if (
      (this.maxCompleted && existingR.length >= this.maxCompleted) ||
      (filterByData && existingR.length)
    ) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.TASK_ALREADY_COMPLETED,
        status: 400,
      });
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
      if (!realization.isValid()) {
        throw new ReferralValidationException(realization);
      }
    }

    await realization.insert(SerializeFor.INSERT_DB, conn);

    await this.db().paramExecute(
      `
        INSERT INTO ${DbTables.TRANSACTION}
          (player_id, direction, amount, realization_id, status)
        VALUES
          (@player_id, ${TransactionDirection.DEPOSIT}, @reward ,@realization_id, ${SqlModelStatus.ACTIVE})
      `,
      { player_id, reward: this.reward, realization_id: realization?.id },
      conn,
    );
  }
}
