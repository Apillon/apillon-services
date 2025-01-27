import { Context, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { decrypt } from '../lib/encrypt-secret';

export class BuildProjectWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.BUILDER_SQS_URL);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(data: {
    url: string;
    websiteUuid: string;
    buildCommand: string;
    installCommand: string;
    buildDirectory: string;
    apiKey: string;
    apiSecret: string;
  }): Promise<any> {
    console.info('RUN EXECUTOR (BuildProjectWorker). data: ', data);

    const scriptPath = resolve(__dirname, 'scripts/build.sh');

    const decryptedSecret = decrypt(
      data.apiSecret,
      env.BUILDER_API_SECRET_ENCRYPTION_KEY,
    );

    const child = spawn(scriptPath, [
      data.url,
      data.websiteUuid,
      data.buildCommand,
      data.installCommand,
      data.buildDirectory,
      data.apiKey,
      decryptedSecret,
    ]);

    child.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on('error', (error) => {
      console.error(`error: ${error.message}`);
    });

    // Wait for the child process to finish
    await new Promise((resolve, reject) => {
      child.on('close', resolve);
      child.on('error', reject);
    });
  }
}
