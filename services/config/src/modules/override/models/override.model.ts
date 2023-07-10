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
    ],
  })
  public value: number;

  public async findByProjectObjectUuid(dto: QuotaOverrideDto): Promise<this[]> {
    if (!dto.project_uuid && !dto.object_uuid) {
      throw new Error('project_uuid and object_uuid should not be null');
    }

    const data: any[] = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE (project_uuid IS NULL OR project_uuid = @project_uuid)
      AND (object_uuid IS NULL OR object_uuid = @object_uuid)
      AND status <> ${SqlModelStatus.DELETED};
      `,
      dto,
    );

    return data?.map((override) => this.populate(override, PopulateFrom.DB));
  }

  public async findManyByObjectUuid(object_uuid: string): Promise<this[]> {
    if (!object_uuid) {
      throw new Error('object_uuid should not be null');
    }

    const data: any[] = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE object_uuid = @object_uuid AND status <> ${SqlModelStatus.DELETED};
      `,
      { object_uuid },
    );

    if (!data?.length) {
      return null;
    }

    return data.map((override) => this.populate(override, PopulateFrom.DB));
  }
}
