import {
  Context,
  EmailDataDto,
  EmailTemplate,
  Mailing,
  env,
  runWithWorkers,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Dwellir } from '../lib/dwellir/dwellir';
import { DwellirUser } from '../modules/rpc/models/dwelir-user.model';

const FREE_RPC_API_LIMIT = 400000;

export class RpcUsageCheckWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(
      workerDefinition,
      context,
      type,
      env.INFRASTRUCTURE_AWS_WORKER_SQS_URL,
    );
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(input: { data: any }): Promise<any> {
    console.info('RUN EXECUTOR (RpcUsageCheckWorker');
    const usagesAll = await Dwellir.getAllUsagesPerUser();
    const dwellirIdsWithLargeUsage: string[] = [];
    for (const [userId, usage] of Object.entries(usagesAll)) {
      if (usage.total_requests > FREE_RPC_API_LIMIT) {
        dwellirIdsWithLargeUsage.push(userId);
      }
    }

    const dwellirUsers = await new DwellirUser(
      {},
      this.context,
    ).populateByDwellirIds(dwellirIdsWithLargeUsage);

    const newlyExceededUsers = dwellirUsers.filter(
      (user) => !user.exceeded_monthly_limit,
    );

    await Promise.all([
      new DwellirUser({}, this.context).updateManyExceededMonthlyLimit(
        newlyExceededUsers.map((dwellirUser) => dwellirUser.id),
        true,
      ),
      // To update the users that might have exceeded the limit in the past
      new DwellirUser({}, this.context).updateManyExceededMonthlyLimit(
        dwellirUsers.map((dwellirUser) => dwellirUser.id),
        false,
        true,
      ),
    ]);

    const mailingMS = new Mailing(this.context);

    await runWithWorkers(
      newlyExceededUsers,
      10,
      this.context,
      async (user: DwellirUser) => {
        mailingMS.sendMail(
          new EmailDataDto({
            mailAddresses: [user.email],
            templateName: EmailTemplate.RPC_USAGE_EXCEEDED,
            templateData: {},
          }),
        );
      },
    );
  }
}
