import {
  AWS_KMS,
  Context,
  DeploymentBuildStatus,
  SerializeFor,
  env,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { spawn } from 'child_process';
import { DeploymentBuild } from '../modules/fe-deploy/models/deployment-build.model';
import { BuildProjectWorkerInterface } from '../lib/interfaces/build-project-worker.interface';
import { GithubProjectConfig } from '../modules/fe-deploy/models/github-project-config.model';
import { GithubService } from '../modules/fe-deploy/services/github.service';

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
rm -rf /tmp/.npm
rm -rf /tmp/npm-global

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
if [ -n "$INSTALL_COMMAND" ] && [ "$INSTALL_COMMAND" != "undefined" ]; then
  export HOME=/tmp
  export npm_config_cache=/tmp/.npm
  export npm_config_prefix=/tmp/npm-global
  mkdir -p /tmp/.npm /tmp/npm-global

  npm config set cache /tmp/.npm

  echo "Running install command: $INSTALL_COMMAND"
  sh -c "$INSTALL_COMMAND"
  echo "Install completed successfully."
else
  echo "Install command not set"
fi

# Check if a build command is provided and run it
if [ -n "$BUILD_COMMAND" ] && [ "$BUILD_COMMAND" != "undefined" ]; then
  echo "Running custom build command: $BUILD_COMMAND"
  sh -c "$BUILD_COMMAND"
  echo "Build completed successfully."
else
  echo "Build command not set"
fi



# SET values for Apillon

echo "Uploading the website to Apillon..."
#npm install -g @apillon/cli
npm install -g @apillon/cli

#npx @apillon/cli hosting deploy-website $BUILD_DIR --uuid "$WEBSITE_UUID" --key "$APILLON_API_KEY" --secret "$APILLON_API_SECRET"

npx @apillon/cli hosting deploy-website $BUILD_DIR --uuid "$WEBSITE_UUID" --key "$APILLON_API_KEY" --secret "$APILLON_API_SECRET"

exit 0`;

function sanitizeToJsonString(str: string) {
  // First, temporarily replace date strings to protect them
  let result = str;

  // Find and store all date-like strings
  const datePattern = /'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)'/g;
  const dates = [];
  let match: string[] | null;

  while ((match = datePattern.exec(str)) !== null) {
    dates.push(match[1]);
  }

  // Replace date strings with placeholders
  result = result.replace(datePattern, "'DATE_PLACEHOLDER'");

  // Add double quotes around property names
  result = result.replace(/(\w+)\s*:/g, '"$1":');

  // Replace single quotes with double quotes for regular string values
  result = result.replace(/'([^']*)'/g, '"$1"');

  // Handle null values
  result = result.replace(/"(null)"/g, '$1');

  // Restore date strings
  for (const date of dates) {
    result = result.replace('"DATE_PLACEHOLDER"', `"${date}"`);
  }

  return result;
}

export class BuildProjectWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
    private readonly githubService: GithubService,
  ) {
    super(workerDefinition, context, type, env.BUILDER_SQS_URL);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(data: BuildProjectWorkerInterface): Promise<any> {
    console.info('RUN EXECUTOR (BuildProjectWorker). data: ', data);

    const deploymentBuild = await new DeploymentBuild(
      {},
      this.context,
    ).populateById(data.deploymentBuildId, undefined, undefined, true);

    if (!deploymentBuild.exists()) {
      console.error('Deployment build does not exist');
      return;
    }

    deploymentBuild.buildStatus = DeploymentBuildStatus.IN_PROGRESS;
    deploymentBuild.logs = '';

    await deploymentBuild.update(SerializeFor.UPDATE_DB);

    let url = data.url;
    let secret = data.apiSecret;

    if (data.isTriggeredByWebhook) {
      const githubProjectConfig = await new GithubProjectConfig(
        {},
        this.context,
      ).populateByWebsiteUuid(data.websiteUuid);

      if (!githubProjectConfig.exists()) {
        console.error('Github project config not found');
        await deploymentBuild.handleFailure('Github project config not found');
        return;
      }

      const kmsClient = new AWS_KMS();

      secret = await kmsClient.decrypt(data.apiSecret, env.DEPLOY_KMS_KEY_ID);

      const accessToken = githubProjectConfig.refresh_token
        ? await this.githubService.refreshAccessToken(githubProjectConfig)
        : githubProjectConfig.access_token;

      url = url.replace('https://', `https://oauth2:${accessToken}@`);
    }
    let lastLog = '';

    const child = spawn(
      '/bin/bash',
      [
        '-c',
        script,
        url,
        data.websiteUuid,
        data.buildCommand,
        data.installCommand,
        data.buildDirectory,
        data.apiKey,
        secret,
      ],
      {
        env: {
          LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH,
          NODE_PATH: process.env.NODE_PATH,
          PATH: process.env.PATH,
          APILLON_API_URL: process.env.APILLON_API_URL,
          ...data.variables.reduce((vars, variable) => {
            vars[variable.key] = variable.value;
            return vars;
          }, {}),
        },
      },
    );

    child.stdout.on('data', async (data) => {
      const log = data.toString();
      lastLog = log;
      await deploymentBuild.addLog(log);
      console.log(`stdout: ${log}`);
    });

    child.stderr.on('data', async (data) => {
      const log = data.toString();
      lastLog = log;
      await deploymentBuild.addLog(log);
      console.error(`stderr: ${data}`);
    });

    child.on('error', async (error) => {
      lastLog = error.message;
      await deploymentBuild.addLog(error.message);
      console.error(`error: ${error.message}`);
    });

    // Wait for the child process to finish
    await new Promise((resolve, reject) => {
      child.on('close', async (exitCode) => {
        console.log('Exit code: ', exitCode);
        console.log('Last log: ', lastLog);
        if (exitCode !== 0) {
          await deploymentBuild.handleFailure();
          console.log(`Failure, child process exited with code ${exitCode}`);
          reject(exitCode);
        } else {
          // Check if data is JSON
          try {
            const sanitizedLog = sanitizeToJsonString(lastLog);
            const parsedResponse = JSON.parse(sanitizedLog);
            console.log('Parsed response: ', parsedResponse);
            await deploymentBuild.handleSuccess();
          } catch (e) {
            await deploymentBuild.handleFailure();
          }
          console.log(`Success, child process exited with code ${data}`);
          resolve(data);
        }
      });
      child.on('error', async (data) => {
        await deploymentBuild.handleFailure();
        console.log(`Failure, child process exited with code ${data}`);
        reject(data);
      });
    });

    console.log('Promise resolved');
  }
}
