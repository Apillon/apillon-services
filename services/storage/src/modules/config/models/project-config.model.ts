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
   * Get ipfs api for project otherwise default one
   * @returns ipfs api
   */
  public async getIpfsApi(): Promise<string> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT c.ipfsApi
        FROM \`${DbTables.IPFS_CLUSTER}\` c
        LEFT JOIN \`${DbTables.PROJECT_CONFIG}\` pc ON pc.ipfsCluster_id = pc.id
        WHERE (pc.project_uuid = @project_uuid OR c.isDefault = 1)
        AND c.status = ${SqlModelStatus.ACTIVE}
        ORDER BY c.isDefault DESC
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

    return data[0].ipfsApi;
  }

  /**
   * Get ipfsGateway for project otherwise default one
   * @returns ipfs gateway
   */
  public async getIpfsGateway(): Promise<{ url: string; private: boolean }> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT c.ipfsGateway, c.private
        FROM \`${DbTables.IPFS_CLUSTER}\` c
        LEFT JOIN \`${DbTables.PROJECT_CONFIG}\` pc ON pc.ipfsCluster_id = pc.id
        WHERE (pc.project_uuid = @project_uuid OR c.isDefault = 1)
        AND c.status = ${SqlModelStatus.ACTIVE}
        ORDER BY c.isDefault DESC
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

    return { url: data[0].ipfsGateway, private: data[0].private };
  }

  /**
   * Get IPFS cluster server for project, otherwise default one
   * @returns cluster server
   */
  public async getIpfsClusterServer(): Promise<string> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT c.clusterServer
        FROM \`${DbTables.IPFS_CLUSTER}\` c
        LEFT JOIN \`${DbTables.PROJECT_CONFIG}\` pc ON pc.ipfsCluster_id = pc.id
        WHERE (pc.project_uuid = @project_uuid OR c.isDefault = 1)
        AND c.status = ${SqlModelStatus.ACTIVE}
        ORDER BY c.isDefault DESC
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

    return data[0].clusterServer;
  }
}
