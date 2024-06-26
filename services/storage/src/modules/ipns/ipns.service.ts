import {
  CreateIpnsDto,
  IpnsQueryFilter,
  Lmas,
  LogType,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { StorageErrorCode } from '../../config/types';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { Bucket } from '../bucket/models/bucket.model';
import { IPFSService } from '../ipfs/ipfs.service';
import { Ipns } from './models/ipns.model';

export class IpnsService {
  static async listIpns(
    event: { query: IpnsQueryFilter },
    context: ServiceContext,
  ) {
    return await new Ipns({}, context).getList(
      context,
      new IpnsQueryFilter(event.query),
    );
  }

  static async getIpns(event: { ipns_uuid: string }, context: ServiceContext) {
    const ipns: Ipns = await new Ipns({}, context).populateByUUID(
      event.ipns_uuid,
      'ipns_uuid',
    );
    if (!ipns.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.IPNS_NOT_FOUND,
        status: 404,
      });
    }
    ipns.canAccess(context);
    await ipns.populateLink();

    return ipns.serializeByContext();
  }

  static async createIpns(
    event: { body: CreateIpnsDto },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateByUUID(
      event.body.bucket_uuid,
    );
    if (!b.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    b.canModify(context);

    const ipns: Ipns = new Ipns(event.body, context);
    ipns.populate({
      project_uuid: b.project_uuid,
      bucket_id: b.id,
      status: SqlModelStatus.INCOMPLETE,
    });
    const conn = await context.mysql.start();
    try {
      //Insert
      await ipns.insert(SerializeFor.INSERT_DB, conn);

      //If cid is specified, publish ipns to point to cid - other nodes will be able to resolve it
      if (event.body.cid) {
        await IpnsService.publishIpns(
          {
            ipns_uuid: ipns.ipns_uuid,
            cid: event.body.cid,
            ipns: ipns,
            conn: conn,
          },
          context,
        );
      }

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw new StorageCodeException({
        context,
        code: StorageErrorCode.ERROR_CREATING_IPNS_RECORD,
        details: err,
        status: 500,
      }).writeToMonitor({
        project_uuid: b.project_uuid,
      });
    }

    await new Lmas().writeLog({
      context,
      project_uuid: b.project_uuid,
      logType: LogType.INFO,
      message: 'New ipns record created',
      location: 'BucketService/createBucket',
      service: ServiceName.STORAGE,
      data: ipns.serialize(),
    });

    await ipns.populateLink();
    return ipns.serializeByContext();
  }

  /**
   * Publish IPNS record, to point to CID
   * @param event
   * @param context
   */
  static async publishIpns(
    event: {
      ipns_uuid: string;
      cid: string;
      ipns?: Ipns;
      conn?: PoolConnection;
    },
    context: ServiceContext,
  ) {
    const ipns: Ipns = event.ipns
      ? event.ipns
      : await new Ipns({}, context).populateByUUID(
          event.ipns_uuid,
          undefined,
          event.conn,
        );

    if (!ipns.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.IPNS_NOT_FOUND,
        status: 404,
      });
    }
    ipns.canModify(context);

    try {
      const publishedIpns = await new IPFSService(
        context,
        ipns.project_uuid,
      ).publishToIPNS(
        event.cid,
        `${ipns.project_uuid}_${ipns.bucket_id}_${ipns.id}`,
      );

      ipns.ipnsName = publishedIpns.name;
      ipns.ipnsValue = publishedIpns.value;
      ipns.key = `${ipns.project_uuid}_${ipns.bucket_id}_${ipns.id}`;
      ipns.cid = event.cid;
      ipns.status = SqlModelStatus.ACTIVE;

      await ipns.update(SerializeFor.UPDATE_DB, event.conn);
    } catch (err) {
      await new Lmas().writeLog({
        context,
        logType: LogType.ERROR,
        project_uuid: ipns.project_uuid,
        message: 'Error at publishing CID to IPNS',
        service: ServiceName.STORAGE,
        location: 'ipns.service.ts/publishIpns',
        data: {
          ipns: ipns.serialize(SerializeFor.PROFILE),
          err,
        },
      });
      throw err;
    }

    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      project_uuid: ipns.project_uuid,
      message: 'Success publishing CID to IPNS',
      service: ServiceName.STORAGE,
      data: {
        ipns: ipns.serialize(SerializeFor.PROFILE),
      },
    });

    await ipns.populateLink();
    return ipns.serializeByContext();
  }

  static async updateIpns(
    event: { ipns_uuid: string; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const ipns: Ipns = await new Ipns({}, context).populateByUUID(
      event.ipns_uuid,
    );

    if (!ipns.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.IPNS_NOT_FOUND,
        status: 404,
      });
    }
    ipns.canModify(context);

    ipns.populate(event.data, PopulateFrom.PROFILE);

    await ipns.validateOrThrow(StorageValidationException);

    await ipns.update();
    await ipns.populateLink();
    return ipns.serializeByContext();
  }

  static async deleteIpns(
    event: { ipns_uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const ipns: Ipns = await new Ipns({}, context).populateByUUID(
      event.ipns_uuid,
    );

    if (!ipns.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.IPNS_NOT_FOUND,
        status: 404,
      });
    }
    ipns.canModify(context);

    await ipns.delete();
    return ipns.serializeByContext();
  }
}
