export enum DbTables {
  JOB = 'job',
  WORKER_LOG = 'worker_log',
}

export enum WorkerLogStatus {
  DEBUG = 0,
  START = 1,
  INFO = 2,
  WARNING = 3,
  SUCCESS = 5,
  ERROR = 9,
}

export enum QueueWorkerType {
  PLANNER = 'PLANNER',
  EXECUTOR = 'EXECUTOR',
}
