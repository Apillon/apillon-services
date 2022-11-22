export enum ServiceDefinitionType {
  LAMBDA,
  SQS,
}

export interface ServiceDefinition {
  type: ServiceDefinitionType;
  config:
    | AWS.SQS.Types.ClientConfiguration
    | AWS.Lambda.Types.ClientConfiguration;
  params: AWS.SQS.Types.SendMessageRequest | AWS.Lambda.Types.InvocationRequest;
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
