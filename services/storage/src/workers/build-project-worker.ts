import { AWS_KMS, Context, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { spawn } from 'child_process';
import { DeploymentBuild } from '../modules/deploy/models/deployment-build.model';
import { DeploymentBuildStatus } from '@apillon/lib';
import { GithubProjectConfig } from '../modules/deploy/models/github-project-config.model';
import { refreshAccessToken } from '../lib/github';

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

  npm config set cache /tmp/.npm

  echo "Running install command: $INSTALL_COMMAND"
  $INSTALL_COMMAND
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
    websiteUuid: string;
    buildCommand: string;
    installCommand: string;
    buildDirectory: string;
    apiKey: string;
    apiSecret: string;
    url: string;
  }): Promise<any> {
    console.info('RUN EXECUTOR (BuildProjectWorker). data: ', data);

    const deploymentBuild = await new DeploymentBuild(
      {},
      this.context,
    ).populateById(data.deploymentBuildId, undefined, undefined, true);

    if (!deploymentBuild.exists()) {
      console.error('Deployment build does not exist');
      return;
    }

    const githubProjectConfig = await new GithubProjectConfig(
      {},
      this.context,
    ).populateByWebsiteUuid(data.websiteUuid);

    if (!githubProjectConfig.exists()) {
      console.error('Github project config not found');
      await deploymentBuild.handleFailure('Github project config not found');
      return;
    }

    deploymentBuild.buildStatus = DeploymentBuildStatus.IN_PROGRESS;
    deploymentBuild.logs = '';

    await deploymentBuild.update();

    const kmsClient = new AWS_KMS();

    const decryptedSecret = await kmsClient.decrypt(
      data.apiSecret,
      env.DEPLOY_KMS_KEY_ID,
    );

    const accessToken = githubProjectConfig.refresh_token
      ? await refreshAccessToken(githubProjectConfig)
      : githubProjectConfig.access_token;

    const urlWithToken = data.url.replace(
      'https://',
      `https://oauth2:${accessToken}@`,
    );

    const child = spawn(
      '/bin/bash',
      [
        '-c',
        script,
        urlWithToken,
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
      const log = data.toString();
      await deploymentBuild.addLog(log);
      console.log(`stdout: ${log}`);
      lastLog = log;
    });

    child.stderr.on('data', async (data) => {
      const log = data.toString();
      await deploymentBuild.addLog(log);
      console.error(`stderr: ${data}`);
    });

    child.on('error', async (error) => {
      await deploymentBuild.addLog(error.message);
      console.error(`error: ${error.message}`);
      lastLog = '';
    });

    // Wait for the child process to finish
    await new Promise((resolve, reject) => {
      child.on('close', async (data) => {
        if (!lastLog) {
          await deploymentBuild.handleFailure();
          reject(data);
        } else {
          try {
            const deployInfo = JSON.parse(lastLog) as {
              uuid: string;
            };
            await deploymentBuild.handleSuccess(deployInfo.uuid);
            console.log(`Success, child process exited with code ${data}`);
            resolve(data);
          } catch (error) {
            console.log('Error parsing deployment information', error);
            await deploymentBuild.handleSuccess();
            resolve(data);
          }
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
