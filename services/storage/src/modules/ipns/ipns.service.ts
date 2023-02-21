import {
  AppEnvironment,
  CreateIpnsDto,
  env,
  IpnsQueryFilter,
  Lmas,
  LogType,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { StorageErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../lib/exceptions';
import { PublishToIPNSWorker } from '../../workers/publish-to-ipns-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Bucket } from '../bucket/models/bucket.model';
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

  static async getIpns(event: { id: number }, context: ServiceContext) {
    const ipns: Ipns = await new Ipns({}, context).populateById(event.id);
    if (!ipns.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.IPNS_NOT_FOUND,
        status: 404,
      });
    }
    ipns.canAccess(context);

    return ipns.serialize(SerializeFor.PROFILE);
  }

  static async createIpns(
    event: { body: CreateIpnsDto },
    context: ServiceContext,
  ): Promise<any> {
    const b: Bucket = await new Bucket({}, context).populateById(
      event.body.bucket_id,
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
      status: SqlModelStatus.INCOMPLETE,
    });
    try {
      await ipns.validate();
    } catch (err) {
      await ipns.handle(err);
      if (!ipns.isValid()) throw new StorageValidationException(ipns);
    }
    const conn = await context.mysql.start();
    try {
      //Insert
      await ipns.insert(SerializeFor.INSERT_DB, conn);

      //If cid is specified, publish ipns to point to cid - other nodes will be able to resolve it
      if (event.body.cid) {
        await IpnsService.publishIpns(
          {
            ipns_id: ipns.id,
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
        project_uuid: event.body.project_uuid,
      });
    }

    await new Lmas().writeLog({
      context,
      project_uuid: event.body.project_uuid,
      logType: LogType.INFO,
      message: 'New ipns record created',
      location: 'BucketService/createBucket',
      service: ServiceName.STORAGE,
      data: ipns.serialize(),
    });

    return ipns.serialize(SerializeFor.PROFILE);
  }

  /**
   * Publish IPNS record, to point to CID
   * @param event
   * @param context
   */
  static async publishIpns(
    event: { ipns_id: number; cid: string; ipns?: Ipns; conn?: PoolConnection },
    context: ServiceContext,
  ) {
    const ipns: Ipns = event.ipns
      ? event.ipns
      : await new Ipns({}, context).populateById(event.ipns_id, event.conn);

    if (!ipns.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.IPNS_RECORD_NOT_FOUND,
        status: 404,
      });
    }
    ipns.canModify(context);

    ipns.status = SqlModelStatus.INCOMPLETE;
    await ipns.update();

    if (
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      //Directly calls worker, to publish CID to IPNS
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };
      const parameters = {
        cid: event.cid,
        ipns_id: ipns.id,
      };
      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.PUBLISH_TO_IPNS_WORKER,
        {
          parameters,
        },
      );

      const worker = new PublishToIPNSWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor({
        cid: event.cid,
        ipns_id: ipns.id,
      });
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.STORAGE_AWS_WORKER_SQS_URL,
        WorkerName.PUBLISH_TO_IPNS_WORKER,
        [
          {
            cid: event.cid,
            ipns_id: ipns.id,
          },
        ],
        null,
        null,
      );
    }

    return ipns.serialize(SerializeFor.PROFILE);
  }

  static async updateIpns(
    event: { id: number; data: any },
    context: ServiceContext,
  ): Promise<any> {
    const ipns: Ipns = await new Ipns({}, context).populateById(event.id);

    if (!ipns.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.IPNS_RECORD_NOT_FOUND,
        status: 404,
      });
    }
    ipns.canModify(context);

    ipns.populate(event.data, PopulateFrom.PROFILE);

    try {
      await ipns.validate();
    } catch (err) {
      await ipns.handle(err);
      if (!ipns.isValid()) throw new StorageValidationException(ipns);
    }

    await ipns.update();
    return ipns.serialize(SerializeFor.PROFILE);
  }

  static async deleteIpns(
    event: { id: number },
    context: ServiceContext,
  ): Promise<any> {
    const ipns: Ipns = await new Ipns({}, context).populateById(event.id);

    if (!ipns.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.IPNS_RECORD_NOT_FOUND,
        status: 404,
      });
    }
    ipns.canModify(context);

    await ipns.delete();
    return ipns.serialize(SerializeFor.PROFILE);
  }
}
