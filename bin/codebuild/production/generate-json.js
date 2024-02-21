// import * as fs from 'fs';
// import * as readline from 'readline';

fs = require('fs');
readline = require('readline');

const sampleJsonConfig = {
  name: 'XXXProject Name',
  environment: {
    computeType: 'BUILD_GENERAL1_SMALL',
    imagePullCredentialsType: 'CODEBUILD',
    privilegedMode: false,
    image: 'aws/codebuild/amazonlinux2-x86_64-standard:5.0',
    environmentVariables: [
      {
        type: 'PLAINTEXT',
        name: 'ENV',
        value: 'XXXENV#production',
      },
      {
        type: 'PLAINTEXT',
        name: 'S3_CONFIG',
        value: 'XXXs3://env.yml#s3://apillon-services-config/env.prod.yml',
      },
      {
        type: 'PLAINTEXT',
        name: 'SERVICE_PATH',
        value: 'XXXservices/path/',
      },
      {
        type: 'PLAINTEXT',
        name: 'DB_MIGRATIONS',
        value: 'XXXmigrations#true',
      },
      {
        type: 'PLAINTEXT',
        name: 'WORKERS_LIB',
        value: 'XXXworkers-lib#false',
      },
      {
        type: 'PLAINTEXT',
        name: 'MODULES_LIB',
        value: 'XXXmodules-lib#false',
      },
      {
        type: 'PLAINTEXT',
        name: 'AWS_SECRETS_ID',
        value: 'XXXAWS_SECRETS_ID#apillon-production',
      },
      {
        type: 'PLAINTEXT',
        name: 'WORKER_SQS_ARN',
        value: 'XXXSQS_ARN#none',
      },
    ],
    type: 'LINUX_CONTAINER',
  },
  timeoutInMinutes: 60,
  serviceRole: 'arn:aws:iam::018021943180:role/atv2-deployer',
  artifacts: {
    type: 'NO_ARTIFACTS',
  },
  cache: {
    type: 'NO_CACHE',
  },
  sourceVersion: 'XXXsourceVersion#master',
  source: {
    insecureSsl: false,
    gitSubmodulesConfig: {
      fetchSubmodules: false,
    },
    location:
      'https://TineMlakar@bitbucket.org/kalmiadevs/apillon-services.git',
    gitCloneDepth: 1,
    type: 'BITBUCKET',
    reportBuildStatus: false,
  },
  badgeEnabled: true,
  queuedTimeoutInMinutes: 480,
  logsConfig: {
    s3Logs: {
      status: 'DISABLED',
      encryptionDisabled: false,
    },
    cloudWatchLogs: {
      status: 'ENABLED',
      groupName: 'codebuild',
      streamName: 'XXXcloudWatch#apillon-services-production',
    },
  },
  encryptionKey: 'arn:aws:kms:eu-west-1:018021943180:alias/aws/s3',
  vpcConfig: {
    subnets: [
      'subnet-0bea6dd0c2a5ecc61',
      'subnet-085447b898128fc92',
      'subnet-0ed148d48e931f5fa',
    ],
    vpcId: 'vpc-077437e060881265d',
    securityGroupIds: ['sg-091bc1ce7424a7921'],
  },
};

const sampleJsonWebhook = {
  projectName: 'XXXProject Name',
  filterGroups: [
    [
      {
        pattern: 'PUSH',
        type: 'EVENT',
        excludeMatchedPattern: false,
      },
      {
        pattern: 'XXXbranch-paterrn#refs/heads/master$',
        type: 'HEAD_REF',
        excludeMatchedPattern: false,
      },
    ],
  ],
  buildType: 'BUILD',
};

let projectName;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

const replaceXXXValues = async (obj, parentKeys = []) => {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      await replaceXXXValues(obj[key], [...parentKeys, key]);
    } else if (typeof obj[key] === 'string' && obj[key].startsWith('XXX')) {
      const paramName = obj[key].substring(3).split('#')[0];

      let defaultValue;
      if (paramName === 'Project Name' && projectName) {
        defaultValue = projectName;
      } else {
        defaultValue =
          obj[key].split('#').length > 1 ? obj[key].split('#')[1] : null;
      }
      const userInput = await askQuestion(
        `Enter value for ${[...parentKeys, paramName].join('.')}${
          defaultValue ? `[${defaultValue}]` : ''
        }: `,
      );
      obj[key] = userInput || defaultValue;
      if (paramName === 'Project Name' && !projectName) {
        projectName = obj[key];
      }
    }
  }
};

const main = async () => {
  await replaceXXXValues(sampleJsonConfig);
  await replaceXXXValues(sampleJsonWebhook);

  let filenameConfig = await askQuestion('Enter file name for CONFIG JSON:');
  let filenameWebhook = await askQuestion('Enter file name for WEBHOOK JSON:');

  if (!filenameConfig.endsWith('.json')) {
    filenameConfig = filenameConfig + '.json';
  }
  if (!filenameWebhook.endsWith('.json')) {
    filenameWebhook = filenameWebhook + '.json';
  }

  const jsonString = JSON.stringify(sampleJsonConfig, null, 2);
  fs.writeFileSync(filenameConfig, jsonString);

  const jsonString2 = JSON.stringify(sampleJsonWebhook, null, 2);
  fs.writeFileSync(filenameWebhook, jsonString2);

  console.log('DONE');
  console.log(`Generated JSON file for CONFIG: ${filenameConfig}`);
  console.log(`Generated JSON file for WEBHOOK: ${filenameWebhook}`);

  console.log('CLI commands:');
  console.log(`
aws codebuild create-project --cli-input-json file://${filenameConfig} --profile apillon
aws codebuild create-webhook --cli-input-json file://${filenameWebhook} --profile apillon
  `);

  console.log(`
aws codebuild update-project --cli-input-json file://${filenameConfig} --profile apillon
aws codebuild update-webhook --cli-input-json file://${filenameWebhook} --profile apillon
  `);

  console.log(`
    aws codebuild start-build --project-name ${projectName}
  `);

  rl.close();
};

main().catch((err) => {
  console.error(err);
});
