import { Context, Lmas, LogType, ServiceName } from '@apillon/lib';
import { LogOutput, ServerlessWorker, WorkerDefinition } from '.';
import { writeWorkerLog } from '../logger';
import { WorkerLogStatus } from '../../config/types';
export abstract class BaseWorker extends ServerlessWorker {
  protected context: Context;
  protected workerName: string;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition);
    this.context = context;
    this.workerName = workerDefinition.workerName;
  }

  protected async writeEventLog(
    options: {
      logType: LogType;
      message: string;
      service: ServiceName | string;
      data?: any;
      err?: Error;
      project_uuid?: string;
    },
    output = LogOutput.EVENT_INFO,
  ) {
    switch (output) {
      case LogOutput.EVENT_WARN:
      case LogOutput.SYS_WARN:
        console.warn(
          `[${this.workerName}] ${options.message} ${JSON.stringify(
            options.data,
          )}`,
          options.err,
        );
        break;
      case LogOutput.EVENT_ERROR:
      case LogOutput.SYS_ERROR:
        console.error(
          `[${this.workerName}] ${options.message} ${JSON.stringify(
            options.data,
          )}`,
          options.err,
        );
        break;
      default:
        console.log(
          `[${this.workerName}] ${options.message} ${JSON.stringify(
            options.data,
          )}`,
        );
    }

    const workerStatusDict = {
      [LogType.WARN]: WorkerLogStatus.WARNING,
      [LogType.ERROR]: WorkerLogStatus.ERROR,
    };

    if (output !== LogOutput.DEBUG) {
      await this.writeLogToDb(
        workerStatusDict[options.logType] || WorkerLogStatus.INFO,
        options.message,
        options.data,
        options.err,
      );
    }

    if (
      ![LogOutput.DEBUG, LogOutput.SYS_INFO, LogOutput.SYS_WARN].includes(
        output,
      )
    ) {
      await new Lmas().writeLog({
        logType: options.logType,
        message: options.message,
        location: this.workerName,
        service: options.service,
        data: options.data,
        project_uuid: options.project_uuid,
      });
    }

    const notifyType = {
      [LogOutput.NOTIFY_ALERT]: LogType.ALERT,
      [LogOutput.NOTIFY_WARN]: LogType.WARN,
      [LogOutput.NOTIFY_MSG]: LogType.MSG,
    };

    if (
      [
        LogOutput.NOTIFY_MSG,
        LogOutput.NOTIFY_ALERT,
        LogOutput.NOTIFY_WARN,
      ].includes(output)
    ) {
      await new Lmas().sendAdminAlert(
        `[${this.workerName}] ${options.message} ${options.err}`,
        options.service as any,
        notifyType[output],
      );
    }
  }

  /**
   * Write log to database
   * @param status worker status
   * @param message message
   * @param data any data in JSON
   * @param err Error object
   */
  protected async writeLogToDb(
    status: WorkerLogStatus,
    message: string,
    data?: any,
    err?: Error,
  ) {
    try {
      if (err) {
        message += ` (${err.message})`;
        status = WorkerLogStatus.ERROR;
      }
      await writeWorkerLog(
        this.context,
        status,
        this.workerName,
        null,
        message,
        data,
      );
      this.logFn(`${this.workerName} ${message}`, err);
    } catch (error) {
      console.log('ERROR writing worker log to database!');
      this.logFn(`${this.workerName} ${error.message}`, error);
    }
  }
}
