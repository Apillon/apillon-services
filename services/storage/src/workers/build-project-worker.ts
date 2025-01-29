import { Context, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { spawn } from 'child_process';
import { decrypt } from '../lib/encrypt-secret';

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





echo "REPO_URL: $REPO_URL"
echo "BUILD_COMMAND: $BUILD_COMMAND"
echo "INSTALL_COMMAND: $INSTALL_COMMAND"
echo "APILLON_API_URL: $APILLON_API_URL"
echo "BUILD_DIR: $BUILD_DIR"
echo "WEBSITE_UUID: $WEBSITE_UUID"
echo "APILLON_API_KEY: $APILLON_API_KEY"
echo "APILLON_API_SECRET: $APILLON_API_SECRET"

git clone --progress $REPO_URL $APP_DIR

echo "Repository cloned successfully."

# Navigate to the app directory
cd $APP_DIR

# Install dependencies and build
echo "Installing dependencies..."

# Check if install command is provided and run it
if [ -n "$INSTALL_COMMAND" ]; then
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
npx @apillon/cli hosting deploy-website $BUILD_DIR --uuid "$WEBSITE_UUID" --key "$APILLON_API_KEY" --secret "$APILLON_API_SECRET"`;

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
      child.on('close', (data) => {
        console.log(`child process exited with code ${data}`);
        resolve(data);
      });
      child.on('error', (data) => {
        console.log(`child process exited with code ${data}`);
        reject(data);
      });
    });
  }
}
