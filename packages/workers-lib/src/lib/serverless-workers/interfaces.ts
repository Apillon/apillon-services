import type {
  InvokeCommandInput,
  LambdaClientConfig,
} from '@aws-sdk/client-lambda';
import type {
  SendMessageCommandInput,
  SQSClientConfig,
} from '@aws-sdk/client-sqs';

export enum ServiceDefinitionType {
  LAMBDA,
  SQS,
}

export enum LogOutput {
  /**
   * output: console
   */
  DEBUG,
  /**
   * output: console, db, service
   */
  EVENT_INFO,
  /**
   * output: console, db, service
   */
  EVENT_WARN,
  /**
   * output: console, db, service
   */
  EVENT_ERROR,
  /**
   * output: console, db
   */
  SYS_INFO,
  /**
   * output: console, db
   */
  SYS_WARN,
  /**
   * output: console, db, service
   */
  SYS_ERROR,
  /**
   * output: console, db, service, slack
   */
  NOTIFY_MSG,
  /**
   * output: console, db, service, slack
   */
  NOTIFY_WARN,
  /**
   * output: console, db, service, slack
   */
  NOTIFY_ALERT,
}

export interface ServiceDefinition {
  type: ServiceDefinitionType;
  config: SQSClientConfig | LambdaClientConfig;
  params: SendMessageCommandInput | InvokeCommandInput;
  // functionName: string;
}

export interface IWorkerDefinitionOptions {
  id?: number;
  /**
   * cron time definition
   */
  interval?: string;
  /**
   * time of last execution
   */
  lastRun?: Date;
  /**
   * time of next execution
   */
  nextRun?: Date;
  /**
   * number of seconds to lock the job
   */
  timeout?: number;
  /**
   * any data for job input
   */
  input?: any;
  /**
   * number of unsuccessful jobs attempts
   */
  retries?: number;
  /**
   * any extra parameters for job definition
   */
  parameters?: any;
  /**
   * if true, remove job from DB
   */
  autoRemove?: boolean;
}
