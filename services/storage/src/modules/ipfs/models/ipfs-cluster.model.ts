import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { booleanParser, integerParser, stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { addJwtToIPFSUrl } from '../../../lib/ipfs-utils';
import { IPFSService } from '../ipfs.service';

export class IpfsCluster extends AdvancedSQLModel {
  public readonly tableName = DbTables.IPFS_CLUSTER;

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
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
  })
  public clusterServer: string;

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
        code: StorageErrorCode.IPFS_CLUSTER_REQUIRED_DATA_NOT_PRESENT,
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
        code: StorageErrorCode.IPFS_CLUSTER_REQUIRED_DATA_NOT_PRESENT,
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
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.IPFS_CLUSTER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public ipnsGateway: string;

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
        code: StorageErrorCode.IPFS_CLUSTER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public subdomainGateway: string;

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
        code: StorageErrorCode.IPFS_CLUSTER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public domain: string;

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
    defaultValue: false,
    fakeValue: () => uuidV4(),
  })
  public private: boolean;

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
        code: StorageErrorCode.IPFS_CLUSTER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public region: string;

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
        code: StorageErrorCode.IPFS_CLUSTER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    defaultValue: 'AWS',
  })
  public cloudProvider: string;

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
    defaultValue: 1,
  })
  public performanceLevel: number;

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
    defaultValue: false,
  })
  public isDefault: boolean;

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
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.IPFS_CLUSTER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public secret: string;

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
        code: StorageErrorCode.IPFS_CLUSTER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public loadBalancerIp: string;

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
    defaultValue: false,
  })
  public pinOnAdd: boolean;

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
  public backupClusterServer: string;

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
  public backupIpfsApi: string;

  /**
   * Generate link to CID/IPNS on IPFS gateway for this project
   * @param project_uuid
   * @param cid cid / ipns name
   * @param isIpns
   * @returns url
   */
  public async generateLink(
    project_uuid: string,
    cid: string,
    isIpns = false,
    path?: string,
    convertToCidV1 = false,
  ): Promise<string> {
    let link = '';

    if (!isIpns && convertToCidV1) {
      const ipfsService = new IPFSService(
        this.getContext(),
        project_uuid,
        true,
      );
      cid = await ipfsService.cidToCidV1(cid);
    }

    if (this.subdomainGateway) {
      link =
        'https://' +
        cid +
        (isIpns ? '.ipns.' : '.ipfs.') +
        this.subdomainGateway +
        '/';
    } else {
      link = (isIpns ? this.ipnsGateway : this.ipfsGateway) + cid + '/';
    }

    if (path) {
      link += path;
    }

    if (this.private) {
      link = addJwtToIPFSUrl(link, project_uuid, cid, this);
    }

    return link;
  }

  public async generateLinks(
    project_uuid: string,
    cids: string[],
    isIpns = false,
    path?: string,
    convertToCidV1 = false,
  ): Promise<string[]> {
    let links = [] as string[];

    if (!isIpns && convertToCidV1) {
      const ipfsService = new IPFSService(
        this.getContext(),
        project_uuid,
        true,
      );

      cids = await Promise.all(cids.map((cid) => ipfsService.cidToCidV1(cid)));
    }

    if (this.subdomainGateway) {
      links = cids.map((cid) =>
        'https://' +
        cid +
        (isIpns ? '.ipns.' : '.ipfs.') +
        this.subdomainGateway +
        '/' +
        path
          ? path
          : '',
      );
    } else {
      links = cids.map((cid) =>
        (isIpns ? this.ipnsGateway : this.ipfsGateway) + cid + '/' + path
          ? path
          : '',
      );
    }

    if (this.private) {
      links = links.map((link, i) =>
        addJwtToIPFSUrl(link, project_uuid, cids[i], this),
      );
    }

    return links;
  }
}
