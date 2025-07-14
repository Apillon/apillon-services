import { Context, MySql, SqlModelStatus, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { PinToCrustRequest } from '../modules/crust/models/pin-to-crust-request.model';

export class UnskipPinToCrustRequestsWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.STORAGE_AWS_WORKER_SQS_URL);
  }

  public async runPlanner(): Promise<any[]> {
    // No planning needed for this worker
    return [];
  }

  public async runExecutor(input: { user_uuid: string }): Promise<any> {
    console.info(
      'RUN EXECUTOR (UnskipPinToCrustRequestsWorker). data: ',
      input,
    );

    const devConsoleSql = new MySql({
      host: env.DEV_CONSOLE_API_MYSQL_HOST,
      database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
      password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
      user: env.DEV_CONSOLE_API_MYSQL_USER,
      port: env.DEV_CONSOLE_API_MYSQL_PORT,
    });

    await devConsoleSql.connect();

    const projects = (await devConsoleSql.paramExecute(
      `
        SELECT p.project_uuid
        FROM project_user pu
        LEFT JOIN project p ON pu.project_id = p.id
        LEFT JOIN user u ON pu.user_id = u.id
        WHERE u.user_uuid = @user_uuid
        AND pu.status = ${SqlModelStatus.ACTIVE}
      `,
      {
        user_uuid: input.user_uuid,
      },
    )) as {
      project_uuid: string;
    }[];

    devConsoleSql.close();

    if (!projects.length) {
      // No projects found for user, nothing to do
      return true;
    }

    await new PinToCrustRequest({}, this.context).unskipByProjectUuids(
      projects.map((p) => p.project_uuid),
    );

    return true;
  }
}
