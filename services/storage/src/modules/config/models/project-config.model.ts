import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { StorageCodeException } from '../../../lib/exceptions';
import { IpfsCluster } from '../../ipfs/models/ipfs-cluster.model';

export class ProjectConfig extends AdvancedSQLModel {
  public readonly tableName = DbTables.PROJECT_CONFIG;

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
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.PROJECT_CONFIG_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public project_uuid: string;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.PROJECT_CONFIG_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public ipfsCluster_id: number;

  /**
   * Get IPFS cluster for project. Custom cluster for project is set, if exists project-config record for given project.
   * @returns ipfsCluster
   */
  public async getIpfsCluster(): Promise<IpfsCluster> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT c.*
        FROM \`${DbTables.IPFS_CLUSTER}\` c
        LEFT JOIN \`${DbTables.PROJECT_CONFIG}\` pc 
          ON pc.ipfsCluster_id = c.id
          AND pc.project_uuid = @project_uuid
        WHERE (pc.project_uuid = @project_uuid OR c.isDefault = 1)
        AND c.status = ${SqlModelStatus.ACTIVE}
        ORDER BY c.isDefault ASC
        LIMIT 1;
      `,
      { project_uuid: this.project_uuid },
    );

    if (!data.length) {
      throw await new StorageCodeException({
        code: StorageErrorCode.IPFS_CLUSTER_NOT_SET,
        status: 500,
        context: this.getContext(),
        sourceFunction: 'getIpfsApi()',
        sourceModule: 'ProjectConfig',
      }).writeToMonitor({
        project_uuid: this.project_uuid,
        sendAdminAlert: true,
      });
    }

    return new IpfsCluster(data[0], this.getContext());
  }
}
