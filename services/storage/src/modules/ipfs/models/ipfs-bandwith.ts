import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  prop,
} from '@apillon/lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables } from '../../../config/types';

export class IpfsBandwith extends AdvancedSQLModel {
  public readonly tableName = DbTables.IPFS_BANDWITH;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public month: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public year: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public bandwith: number;

  /**
   * Populates used ipfs bandwith for project
   * @param project_uuid
   * @param month If not specified, current month is used
   * @param year
   * @returns
   */
  public async populateByProjectAndDate(
    project_uuid: string,
    month?: number,
    year?: number,
  ): Promise<this> {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }
    if (!month || !year) {
      const currDate = new Date();
      month = currDate.getMonth() + 1;
      year = currDate.getFullYear();
    }
    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.IPFS_BANDWITH}\`
        WHERE project_uuid = @project_uuid
        AND month = @month
        AND year = @year;
      `,
      { project_uuid, month, year },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
