import { ServiceDefinition, IWorkerDefinitionOptions } from './interfaces';
import * as cronParser from 'cron-parser';
import moment = require('moment');

export class WorkerDefinition {
  /**
   * worker unique name
   */
  public workerName: string;
  /**
   * AWS service definition
   */
  public serviceDefinition: ServiceDefinition;
  /**
   * job id
   */
  public id?: number;
  /**
   * cron time definition
   */
  public interval?: string;
  /**
   * time of last execution
   */
  public lastRun?: Date;
  /**
   * time of next execution
   */
  public nextRun?: Date;
  /**
   * number of seconds to lock the job
   * default = 15min
   */
  public timeout: number = 15 * 60;
  /**
   * any data for job input
   */
  public input?: any;
  /**
   * number of unsuccessful jobs attempts
   */
  public retries?: number;
  /**
   * any extra parameters for job definition
   */
  public parameters?: any;
  /**
   * if true, remove job from DB
   */
  public autoRemove?: boolean;

  public lastCompleted: Date;
  public lastFailed: Date;
  public lastDuration: number;
  public lastError: string;

  public constructor(
    serviceDefinition: ServiceDefinition,
    workerName: string,
    options?: IWorkerDefinitionOptions,
  ) {
    this.workerName = workerName;
    this.serviceDefinition = serviceDefinition;
    if (options) {
      this.id = options.id;
      this.interval = options.interval;
      this.lastRun = options.lastRun;
      this.nextRun = options.nextRun;
      this.input = options.input;
      this.retries = options.retries || 0;
      this.timeout = options.timeout || 15 * 60;
      this.parameters = options.parameters;
      this.autoRemove = options.autoRemove;
    }
  }

  public setNextRun() {
    if (this.interval) {
      try {
        this.nextRun = cronParser
          .parseExpression(this.interval, {
            currentDate: this.lastRun || new Date(),
          })
          .next()
          .toDate();
        // console.log(`Next run is set to ${this.nextRun}`);
      } catch (error) {
        console.error(error);
        this.nextRun = null;
      }
    } else {
      this.nextRun = null;
    }
  }

  public setStarted() {
    // set lock time
    this.nextRun = moment().add(this.timeout, 'seconds').toDate();
    this.lastRun = new Date();
    this.retries++;
  }

  public setCompleted() {
    this.lastCompleted = new Date();
    this.lastDuration = moment().diff(moment(this.lastRun), 'ms');
    this.retries = 0;
    this.lastError = null;
    this.setNextRun();
  }

  public setFailed(error: Error) {
    this.lastError = error.message;
    this.lastFailed = new Date();
    this.lastDuration = moment().diff(moment(this.lastRun), 'ms');
    this.setNextRun();
  }
}
