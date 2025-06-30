import {
  Ams,
  AppEnvironment,
  BaseQueryFilter,
  Context,
  EmailDataDto,
  EmailTemplate,
  env,
  LogType,
  Mailing,
  MySql,
  runWithWorkers,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  LogOutput,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { CrustPinningStatus } from '../config/types';
import { CrustService } from '../modules/crust/crust.service';
import { PinToCrustRequest } from '../modules/crust/models/pin-to-crust-request.model';
import { Bucket } from '../modules/bucket/models/bucket.model';

export class PinToCrustWorker extends BaseSingleThreadWorker {
  protected context: Context;
  private accessMS: Ams;
  private mailingMS: Mailing;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
    this.accessMS = new Ams(this.context);
    this.mailingMS = new Mailing(this.context);
  }

  public async runExecutor(data?: any): Promise<any> {
    this.logFn(`PinToCrustWorker - execute BEGIN: ${data}`);

    //Get pending requests
    const pendingPinRequests: PinToCrustRequest[] = await new PinToCrustRequest(
      {},
      this.context,
    ).getPendingRequest();

    console.info(`Num of pendingPinRequests: ${pendingPinRequests.length}`);

    // Group by bucket_uuid

    if (!pendingPinRequests.length) {
      console.info('No pending pin requests found.');
      return true;
    }

    const projectsMap: Map<string, PinToCrustRequest[]> = new Map();
    const bucketToProjectMap: Map<string, string> = new Map(); // Cache for bucket_uuid -> project_uuid mapping

    for (const request of pendingPinRequests) {
      const bucketUuid = request.bucket_uuid;

      // Check if the bucket_uuid is already cached
      let projectUuid = bucketToProjectMap.get(bucketUuid);

      if (!projectUuid) {
        // Query the bucket only if it's not in the cache
        const bucket = await new Bucket({}, this.context).populateByUUID(
          bucketUuid,
        );
        if (!bucket) {
          console.warn(`Project UUID not found for bucket UUID: ${bucketUuid}`);
          continue;
        }
        projectUuid = bucket.project_uuid;

        // Cache the bucket_uuid -> project_uuid mapping
        bucketToProjectMap.set(bucketUuid, projectUuid);
      }

      if (!projectsMap.has(projectUuid)) {
        projectsMap.set(projectUuid, []);
      }
      projectsMap.get(projectUuid)?.push(request);
    }

    console.info(
      `Num of projects with pending pin requests: ${projectsMap.size}`,
    );

    const devConsoleSql = new MySql({
      host: env.DEV_CONSOLE_API_MYSQL_HOST,
      database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
      password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
      user: env.DEV_CONSOLE_API_MYSQL_USER,
      port: env.DEV_CONSOLE_API_MYSQL_PORT,
    });

    await devConsoleSql.connect();

    const skippedRequestIds: number[] = [];

    projectsMap.forEach(async (requestsForProject, projectUuid) => {
      const projectUsers = (await devConsoleSql.paramExecute(
        `
        SELECT u.user_uuid, u.email
        FROM project_user pu
        LEFT JOIN project p ON pu.project_id = p.id
        LEFT JOIN user u ON pu.user_id = u.id
        WHERE p.project_uuid = @project_uuid
        AND pu.status = ${SqlModelStatus.ACTIVE}
      `,
        {
          project_uuid: projectUuid,
        },
      )) as {
        user_uuid: string;
        email: string;
      }[];

      const lastYear = new Date();

      lastYear.setFullYear(lastYear.getFullYear() - 1);

      const inactiveUsers: string[] = [];

      await Promise.all(
        projectUsers.map(async (projectUser) => {
          const userUuid = projectUser.user_uuid;

          const lastLogin = (
            await this.accessMS.getUserLogins(
              userUuid,
              new BaseQueryFilter(
                {
                  limit: 1,
                },
                this.context,
              ),
            )
          ).data.items as {
            loginDate: string;
          }[];

          if (
            !lastLogin.length ||
            new Date(lastLogin[0].loginDate) < lastYear
          ) {
            inactiveUsers.push(projectUser.email);
          }
        }),
      );

      if (inactiveUsers.length === projectUsers.length) {
        // If all users are inactive, skip pinning for this project
        console.info(
          `Skipping pinning for project ${projectUuid} due to inactivity of all users`,
        );
        await new PinToCrustRequest({}, this.context).skipRequests(
          requestsForProject.map((r) => r.id),
        );

        skippedRequestIds.push(...requestsForProject.map((r) => r.id));

        await this.mailingMS.sendMail(
          new EmailDataDto({}, this.context).populate({
            mailAddresses: inactiveUsers,
            templateName: EmailTemplate.PINNING_SKIPPED_DUE_TO_INACTIVITY,
          }),
        );
      }
    });

    const filteredPendingPinRequests = pendingPinRequests.filter(
      (r) => !skippedRequestIds.includes(r.id),
    );

    await runWithWorkers(
      filteredPendingPinRequests,
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
        ? 1
        : 5,
      this.context,
      async (data) => {
        const pinToCrustRequest: PinToCrustRequest = new PinToCrustRequest(
          data,
          this.context,
        );

        const bucket: Bucket = await new Bucket(
          {},
          this.context,
        ).populateByUUID(pinToCrustRequest.bucket_uuid);

        try {
          await CrustService.placeStorageOrderToCRUST(
            {
              cid: pinToCrustRequest.cid,
              size: pinToCrustRequest.size,
              isDirectory: pinToCrustRequest.isDirectory,
              refTable: pinToCrustRequest.refTable,
              refId: pinToCrustRequest.refId,
              project_uuid: bucket.project_uuid,
            },
            this.context,
          );
          pinToCrustRequest.pinningStatus = CrustPinningStatus.SUCCESSFULL;
          pinToCrustRequest.message = '';
          pinToCrustRequest.numOfExecutions += 1;

          await pinToCrustRequest.update();

          await this.writeEventLog({
            logType: LogType.COST,
            project_uuid: bucket.project_uuid,
            message: 'Success placing storage order to CRUST',
            service: ServiceName.STORAGE,
            data: {
              pinToCrustRequest: pinToCrustRequest.serialize(),
            },
          });
        } catch (err) {
          try {
            pinToCrustRequest.pinningStatus = CrustPinningStatus.FAILED;
            pinToCrustRequest.message = err.message;
            pinToCrustRequest.numOfExecutions += 1;

            await pinToCrustRequest.update();
          } catch (err2) {
            console.error(err2);
          }

          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              project_uuid: bucket.project_uuid,
              message: 'Error at placing storage order to CRUST',
              service: ServiceName.STORAGE,
              data: {
                data: {
                  pinToCrustRequest: pinToCrustRequest.serialize(),
                },
                err,
              },
            },
            LogOutput.SYS_ERROR,
          );
        }
      },
    );

    console.info(
      'Pinning completed. Checking for pins, that should be renewed',
    );

    //Get pin to crust request, that need to be renewed.
    //Update those request and they should be pinned in next worker iteration
    await new PinToCrustRequest({}, this.context).renewOldRequests();

    devConsoleSql.close();

    return true;
  }
}
