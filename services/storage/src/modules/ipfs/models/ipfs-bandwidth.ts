import {
  AdvancedSQLModel,
  AppEnvironment,
  Context,
  DomainQueryFilter,
  PoolConnection,
  PopulateFrom,
  QuotaCode,
  Scs,
  SerializeFor,
  SqlModelStatus,
  env,
  prop,
  runWithWorkers,
} from '@apillon/lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, Defaults } from '../../../config/types';

export class IpfsBandwidth extends AdvancedSQLModel {
  public readonly tableName = DbTables.IPFS_BANDWIDTH;

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
  public bandwidth: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public alertStatus: number;

  /**
   * Populates used ipfs bandwidth for project
   * @param project_uuid
   * @param month If not specified, current month is used
   * @param year
   * @returns
   */
  public async populateByProjectAndDate(
    project_uuid: string,
    month?: number,
    year?: number,
    conn?: PoolConnection,
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
        FROM \`${DbTables.IPFS_BANDWIDTH}\`
        WHERE project_uuid = @project_uuid
        AND month = @month
        AND year = @year;
      `,
      { project_uuid, month, year },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async getProjectsOverBandwidthQuota(query: DomainQueryFilter) {
    const currDate = new Date();

    //Get all projects, that have reached max bandwidth on freemium
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT b.project_uuid, b.bandwidth
        FROM \`${DbTables.IPFS_BANDWIDTH}\` b
        WHERE b.month = @month
        AND b.year = @year
        AND b.bandwidth > ${Defaults.DEFAULT_BANDWIDTH_IN_BYTES}
        AND ( @clusterDomain IS NULL or @clusterDomain LIKE (
          SELECT c.domain
          FROM \`${DbTables.IPFS_CLUSTER}\` c
          LEFT JOIN \`${DbTables.PROJECT_CONFIG}\` pc 
            ON pc.ipfsCluster_id = c.id
            AND pc.project_uuid = b.project_uuid
          WHERE (pc.project_uuid = b.project_uuid OR c.isDefault = 1)
          AND c.status = ${SqlModelStatus.ACTIVE}
          ORDER BY c.isDefault ASC
          LIMIT 1
        ))
      `,
      {
        month: currDate.getMonth() + 1,
        year: currDate.getFullYear(),
        clusterDomain: query.ipfsClusterDomain,
      },
    );

    const projectsOverBandwidthQuota = [];

    //Check quota for this projects
    await runWithWorkers(
      data,
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
        ? 1
        : 20,
      this.getContext(),
      async (data: { project_uuid: string; bandwidth: number }) => {
        const bandwidthQuota = await new Scs(this.getContext()).getQuota({
          quota_id: QuotaCode.MAX_BANDWIDTH,
          project_uuid: data.project_uuid,
        });

        if (
          data.bandwidth >
          (bandwidthQuota?.value || Defaults.DEFAULT_BANDWIDTH) * 1073741824
        ) {
          projectsOverBandwidthQuota.push(data.project_uuid);
        }
      },
    );

    return projectsOverBandwidthQuota;
  }
}
