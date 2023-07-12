import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  GetQuotasDto,
  GetQuotaDto,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';
import { QuotaDto } from '@apillon/lib/dist/lib/at-services/config/dtos/quota.dto';

export class Quota extends AdvancedSQLModel {
  public readonly tableName = DbTables.QUOTA;

  /**
   * quota name
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public name: string;

  /**
   * quota group
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public group: string;

  /**
   * quota description
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public description: string;

  /**
   * quota type
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public valueType: number;

  /**
   * value
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public value: number;

  public async getQuotas(
    data: GetQuotaDto | GetQuotasDto,
  ): Promise<QuotaDto[]> {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT q.id,
        q.groupName, q.name, q.description,
        CASE WHEN q.valueType = 2
        THEN
          MIN(LEAST(q.value, IFNULL(o1.value,999), IFNULL(o2.value,999)))
        ELSE
          MAX(GREATEST(q.value, IFNULL(o1.value,0), IFNULL(o2.value,0)))
        END AS value,
        q.valueType,
        q.value AS defaultValue
      FROM quota q
      LEFT JOIN override o1
        ON o1.quota_id = q.id
        AND (o1.project_uuid IS NULL OR o1.project_uuid = @project_uuid)
        AND (o1.object_uuid IS NULL OR o1.object_uuid = @object_uuid)
        AND o1.package_id IS NULL
        AND o1.status = ${SqlModelStatus.ACTIVE}
      LEFT JOIN override o2
        JOIN subscriptionPackage sp
          ON sp.id = o2.package_id
          AND sp.status = ${SqlModelStatus.ACTIVE}
        JOIN subscription s
          ON s.package_id = sp.id
          AND s.project_uuid = @project_uuid
          AND (s.expiresOn IS NULL OR s.expiresOn > NOW())
          AND s.status = ${SqlModelStatus.ACTIVE}
        ON o2.quota_id = q.id
        AND o2.status = ${SqlModelStatus.ACTIVE}
      WHERE q.status = ${SqlModelStatus.ACTIVE}
      AND (@quota_id is NULL OR q.id = @quota_id)
      GROUP BY q.id
    `,
      {
        quota_id: data.quota_id || null,
        project_uuid: data.project_uuid || null,
        object_uuid: data.object_uuid || null,
      },
    );
  }
}
