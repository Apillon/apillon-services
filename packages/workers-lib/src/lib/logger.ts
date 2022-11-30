import { Context } from '@apillon/lib';
import { DbTables, QueueWorkerType, WorkerLogStatus } from '../config/types';

export async function writeWorkerLog(
  context: Context,
  status: WorkerLogStatus,
  worker: string,
  type: QueueWorkerType = null,
  message: string = null,
  data: any = null,
) {
  if (typeof data !== 'object') {
    data = { data };
  }
  await context.mysql.paramExecute(
    `
      INSERT INTO ${DbTables.WORKER_LOG} (status, worker, type, message, data)
      VALUES (@status, @worker, @type, @message, @data)
    `,
    { status, worker, type, message, data },
  );
}
