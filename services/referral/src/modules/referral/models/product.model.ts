import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  BaseQueryFilter,
  Context,
  getQueryParams,
  PopulateFrom,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  getFaker,
} from '@apillon/lib';
import {
  DbTables,
  ReferralErrorCode,
  TransactionDirection,
} from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Order, OrderStatus } from './order.model';
import {
  ReferralCodeException,
  ReferralValidationException,
} from '../../../lib/exceptions';
import { Attribute } from './attribute.model';
import { Player } from './player.model';

export class Product extends AdvancedSQLModel {
  public readonly tableName = DbTables.PRODUCT;

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
    fakeValue: () => getFaker().random.word(),
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    fakeValue: () => getFaker().random.words(6),
  })
  public description: string;

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
    fakeValue: () => getFaker().image.imageUrl(),
  })
  public imageUrl: string;

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
    fakeValue: () => getFaker().datatype.number({ min: 1, max: 20 }),
  })
  public price: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.UPDATE_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    fakeValue: 10,
  })
  public stock: number;

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
    fakeValue: 1,
  })
  public maxOrderCount: number;

  public async alreadyOrdered(player_id: number) {
    if (!this.maxOrderCount) {
      return false;
    }
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT
        COUNT(o.id) as count
      FROM \`${DbTables.ORDER}\` o
      WHERE o.product_id = @product_id
      AND o.player_id = @player_id
      AND o.status <> ${OrderStatus.DELETED}
      `,
      { product_id: this.id, player_id },
    );

    return data[0].count >= this.maxOrderCount;
  }

  public async order(player_id: number, info?: any) {
    if (!this.exists()) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.PLAYER_DOES_NOT_EXISTS,
        status: 400,
      });
    }

    if (!this.stock) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.PRODUCT_OUT_OF_STOCK,
        status: 400,
      });
    }

    if (await this.alreadyOrdered(player_id)) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.MAX_ORDER_REACHED,
        status: 400,
      });
    }

    const conn = await this.getContext().mysql.start();

    try {
      const balance = await this.db().paramExecute(
        `
        SELECT balance FROM ${DbTables.BALANCE}
        WHERE player_id = @player_id
        FOR UPDATE
      `,
        { player_id },
        conn,
      );

      if (!balance || balance.length < 1 || balance[0].balance < this.price) {
        throw new ReferralCodeException({
          code: ReferralErrorCode.INSUFFICIENT_BALANCE,
          status: 400,
        });
      }

      const order = new Order({}, this.getContext()).populate({
        product_id: this.id,
        player_id: player_id,
        volume: 1,
        price: this.price,
        totalCost: this.price,
        info: info,
      });

      const res = (await this.db().paramExecute(
        `
        INSERT INTO ${DbTables.TRANSACTION}
          (player_id, direction, amount, status)
        VALUES
          (@player_id, ${TransactionDirection.WITHDRAW}, @price, ${SqlModelStatus.ACTIVE})
      `,
        { player_id, price: this.price },
        conn,
      )) as any;

      if (res.insertId) {
        order.transaction_id = res.insertId;
      } else {
        throw new ReferralCodeException({
          code: ReferralErrorCode.TRANSACTION_FAILED,
          status: 500,
        });
      }

      await order.validateOrThrow(ReferralValidationException);
      await order.insert(SerializeFor.INSERT_DB, conn);

      this.stock -= 1;

      await this.validateOrThrow(ReferralValidationException);
      await this.update(SerializeFor.UPDATE_DB, conn);

      await this.getContext().mysql.commit(conn);
      return order;
    } catch (e) {
      await this.getContext().mysql.rollback(conn);
      throw e;
    }
  }

  public async getList(context: ServiceContext, filter: BaseQueryFilter) {
    // Map url query with sql fields.
    const fieldMap = {
      id: 'pr.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'pr',
      fieldMap,
      filter.serialize(),
    );

    const player = await new Player({}, context).populateByUserUuid(
      context?.user?.user_uuid,
    );
    params.playerId = player?.id || null;

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('pr', '')},
        IF(MAX(a.id) IS NOT NULL,
          JSON_ARRAYAGG(
            JSON_OBJECT(${new Attribute({}, null).generateSelectJSONFields(
              'a',
            )})
          ),
          JSON_ARRAY()
        ) as attributes,
        (
          SELECT IFNULL(SUM(o.volume),0) FROM \`${DbTables.ORDER}\` o
          WHERE o.product_id = pr.id
          AND o.player_id = @playerId
        ) as orderCount
        `,
      qFrom: `
        FROM \`${DbTables.PRODUCT}\` pr
        LEFT JOIN \`${DbTables.ATTRIBUTE}\` a
          ON a.product_id = pr.id
          AND a.status = ${SqlModelStatus.ACTIVE}
        WHERE pr.status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
      qGroup: `
        GROUP BY
          pr.id
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'pr.id');
  }
}
