import { execSync } from 'child_process';
import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { Lambda, env } from '@apillon/lib';

async function getDeployedLambdaHash(functionName: string) {
  const lambda = new Lambda({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_KEY,
      secretAccessKey: env.AWS_SECRET,
    },
  });
  const response = await lambda.getFunction({ FunctionName: functionName });
  return response.Configuration.CodeSha256;
}

async function generateLocalHash(zipFilePath) {
  const fileData = await readFile(zipFilePath);
  return createHash('sha256').update(fileData).digest('base64');
}

async function shouldDeploy(functionName, stage) {
  // Step 1: Run `serverless package` to generate the .zip file
  console.log('Packaging the service...');
  execSync(`serverless package --stage ${stage}`, { stdio: 'inherit' });

  // Step 2: Locate the .zip file
  const zipFilePath = path.resolve('./.serverless', `${functionName}.zip`);

  // Step 3: Compute the local hash
  const localHash = await generateLocalHash(zipFilePath);

  // Step 4: Fetch the deployed Lambda hash
  const deployedHash = await getDeployedLambdaHash(functionName);

  console.log('Deployed Hash:', deployedHash);
  console.log('Local Hash:', localHash);

  // Step 5: Compare hashes
  return deployedHash !== localHash;
}

// Example usage
(async () => {
  const stage = process.argv[2];

  const functionName = `apillon-${process.argv[3]}-service-${stage}`;

  const deploy = await shouldDeploy(functionName, stage);

  if (deploy) {
    console.log('Changes detected. Proceeding with deployment...');
    execSync(`serverless deploy --stage ${stage}`, { stdio: 'inherit' });
  } else {
    console.log('No changes detected. Skipping deployment.');
  }
})();
