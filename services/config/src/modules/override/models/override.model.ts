import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  PopulateFrom,
  prop,
  QuotaOverrideDto,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';
import { v4 as uuidV4 } from 'uuid';

export class Override extends AdvancedSQLModel {
  public readonly tableName = DbTables.OVERRIDE;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public package_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public quota_id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
    ],
    fakeValue: () => uuidV4(),
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
    ],
    fakeValue: () => uuidV4(),
  })
  public object_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public description: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public value: number;

  public async findByQuotaAndUuid(dto: QuotaOverrideDto): Promise<this> {
    if (!dto.project_uuid && !dto.object_uuid) {
      throw new Error('project_uuid and object_uuid should not be null');
    }

    const data: any[] = await this.getContext().mysql.paramExecute(
      `
      SELECT ${this.generateSelectFields()}
      FROM \`${DbTables.OVERRIDE}\`
      WHERE quota_id = @quota_id
      AND (@project_uuid IS NULL OR project_uuid = @project_uuid)
      AND (@object_uuid IS NULL OR object_uuid = @object_uuid)
      AND status <> ${SqlModelStatus.DELETED};
      `,
      dto,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async findManyByObjectUuid(object_uuid: string): Promise<this[]> {
    if (!object_uuid) {
      throw new Error('object_uuid should not be null');
    }

    const data: any[] = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.OVERRIDE}\`
      WHERE object_uuid = @object_uuid AND status <> ${SqlModelStatus.DELETED};
      `,
      { object_uuid },
    );

    if (!data?.length) {
      return null;
    }

    return data.map((override) => this.populate(override, PopulateFrom.DB));
  }

  public async deleteByObjectUuidsAndQuotaId(
    objectUuids: string[],
    quotaId: number,
  ) {
    await this.getContext().mysql.paramExecute(
      `DELETE FROM \`${DbTables.OVERRIDE}\` WHERE object_uuid IN (${objectUuids.map(
        (uuid) => `'${uuid}'`,
      )}) AND quota_id = @quota_id`,
      { quota_id: quotaId },
    );
  }
}
