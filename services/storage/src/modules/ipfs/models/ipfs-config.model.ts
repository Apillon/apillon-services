import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  env,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { booleanParser, stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import { DbTables, StorageErrorCode } from '../../../config/types';

export class IpfsConfig extends AdvancedSQLModel {
  public readonly tableName = DbTables.IPFS_CONFIG;

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
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.IPFS_CONFIG_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public project_uuid: string;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.IPFS_CONFIG_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public ipfsApi: string;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.IPFS_CONFIG_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public ipfsGateway: string;

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
  })
  public clusterServer: string;

  @prop({
    parser: { resolver: booleanParser() },
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
        code: StorageErrorCode.IPFS_CONFIG_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public private: boolean;

  public async populateByProjectUuid(project_uuid: string): Promise<this> {
    return super.populateByUUID(project_uuid, 'project_uuid');
  }

  /**
   * Get ipfs api for project otherwise default (env.STORAGE_IPFS_API)
   * @returns ipfs api
   */
  public async getIpfsApi(): Promise<string> {
    let ipfsGateway = env.STORAGE_IPFS_API;
    const ipfsConfig = await new IpfsConfig(
      {},
      this.getContext(),
    ).populateByProjectUuid(this.project_uuid);

    if (ipfsConfig.exists()) {
      //Private ipfs
      ipfsGateway = ipfsConfig.ipfsApi;
    }

    return ipfsGateway;
  }

  /**
   * Get ipfsGateway for project otherwise default (env.STORAGE_IPFS_GATEWAY)
   * @returns ipfs gateway
   */
  public async getIpfsGateway(): Promise<string> {
    let ipfsGateway = env.STORAGE_IPFS_GATEWAY;
    const ipfsConfig = await new IpfsConfig(
      {},
      this.getContext(),
    ).populateByProjectUuid(this.project_uuid);

    if (ipfsConfig.exists()) {
      //Private ipfs
      ipfsGateway = ipfsConfig.ipfsGateway;
    }

    return ipfsGateway;
  }

  /**
   * Get IPFS cluster server for project, otherwise default (env.STORAGE_IPFS_CLUSTER_SERVER)
   * @returns cluster server
   */
  public async getIpfsClusterServer(): Promise<string> {
    let clusterServer = env.STORAGE_IPFS_CLUSTER_SERVER;

    const ipfsConfig = await new IpfsConfig(
      {},
      this.getContext(),
    ).populateByProjectUuid(this.project_uuid);

    if (ipfsConfig.exists()) {
      //Private ipfs
      clusterServer = ipfsConfig.clusterServer;
    }
    return clusterServer;
  }
}
