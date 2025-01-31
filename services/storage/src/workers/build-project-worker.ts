import { Context, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { spawn } from 'child_process';
import { decrypt } from '../lib/encrypt-secret';
import { DeploymentBuild } from '../modules/deploy/models/deployment-build.model';
import { DeploymentBuildStatus } from '@apillon/lib';
import { Deployment } from '../modules/hosting/models/deployment.model';

// TO-DO - Move script to runtime
const script = `#!/bin/bash

set -e


# Variables
REPO_URL=$0
WEBSITE_UUID=$1
BUILD_COMMAND=$2
INSTALL_COMMAND=$3
BUILD_DIR=$4
APILLON_API_KEY=$5
APILLON_API_SECRET=$6

APP_DIR=/tmp/github-app

rm -rf "$APP_DIR"

# Clone the repository and checkout the specified branch
echo "Cloning repository $REPO_URL..."

mkdir -p $APP_DIR

git clone --progress $REPO_URL $APP_DIR

echo "Repository cloned successfully."

# Navigate to the app directory
cd $APP_DIR

# Install dependencies and build
echo "Installing dependencies..."

# Check if install command is provided and run it
if [ -n "$INSTALL_COMMAND" ]; then
  export HOME=/tmp
  export npm_config_cache=/tmp/.npm
  export npm_config_prefix=/tmp/npm-global
  mkdir -p /tmp/.npm /tmp/npm-global

  echo "Running install command: $INSTALL_COMMAND"
  $INSTALL_COMMAND --cache /tmp/.npm
  echo "Install completed successfully."
else
  echo "Install command not set"
fi

# Check if a build command is provided and run it
if [ -n "$BUILD_COMMAND" ]; then
  echo "Running custom build command: $BUILD_COMMAND"
  $BUILD_COMMAND
  echo "Build completed successfully."
else
  echo "Build command not set"
fi



# SET values for Apillon

echo "Uploading the website to Apillon..."
#npm install -g @apillon/cli
/var/lang/bin/npm install -g @apillon/cli

#npx @apillon/cli hosting deploy-website $BUILD_DIR --uuid "$WEBSITE_UUID" --key "$APILLON_API_KEY" --secret "$APILLON_API_SECRET"

/var/lang/bin/npx @apillon/cli hosting deploy-website $BUILD_DIR --uuid "$WEBSITE_UUID" --key "$APILLON_API_KEY" --secret "$APILLON_API_SECRET"`;

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
    deploymentBuildId: number;
    url: string;
    websiteUuid: string;
    buildCommand: string;
    installCommand: string;
    buildDirectory: string;
    apiKey: string;
    apiSecret: string;
  }): Promise<any> {
    console.info('RUN EXECUTOR (BuildProjectWorker). data: ', data);

    const deploymentBuild = await new DeploymentBuild(
      {},
      this.context,
    ).populateById(data.deploymentBuildId);

    if (deploymentBuild.exists()) {
      console.info('Deployment build does not exist');
      return;
    }

    deploymentBuild.buildStatus = DeploymentBuildStatus.IN_PROGRESS;

    await deploymentBuild.update();

    const decryptedSecret = decrypt(
      data.apiSecret,
      env.BUILDER_API_SECRET_ENCRYPTION_KEY,
      env.BUILDER_API_SECRET_INITIALIZATION_VECTOR,
    );

    const child = spawn(
      '/bin/bash',
      [
        '-c',
        script,
        data.url,
        data.websiteUuid,
        data.buildCommand,
        data.installCommand,
        data.buildDirectory,
        data.apiKey,
        decryptedSecret,
      ],
      {
        env: {
          ...process.env,
        },
      },
    );

    let lastLog = '';
    child.stdout.on('data', async (data) => {
      await deploymentBuild.addLog(data);
      console.log(`stdout: ${data}`);
    });

    child.stderr.on('data', async (data) => {
      lastLog = data;
      await deploymentBuild.addLog(data);
      console.error(`stderr: ${data}`);
    });

    child.on('error', async (error) => {
      await deploymentBuild.addLog(error.message);
      console.error(`error: ${error.message}`);
    });

    // Wait for the child process to finish
    await new Promise((resolve, reject) => {
      child.on('close', async (data) => {
        try {
          const deployInfo = JSON.parse(lastLog) as {
            uuid: string;
          };
          await deploymentBuild.handleSuccess(deployInfo.uuid);
          console.log(`Success, child process exited with code ${data}`);
          resolve(data);
        } catch (error) {
          console.log('Error parsing deployment information', error);
          await deploymentBuild.handleFailure();
          reject(data);
        }
      });
      child.on('error', async (data) => {
        await deploymentBuild.handleFailure();
        console.log(`Failure, child process exited with code ${data}`);
        reject(data);
      });
    });
  }
}
