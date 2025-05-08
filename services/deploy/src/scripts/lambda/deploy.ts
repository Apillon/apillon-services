import { execSync } from 'child_process';
import { readFile, readdir } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { Lambda, env, yamlParser } from '@apillon/lib';
import { existsSync, readFileSync } from 'fs';

async function getDeployedLambdaHash(functionName: string) {
  const lambda = new Lambda({
    region: process.env.AWS_REGION,
  });
  if (!process.env.AWS_KEY || !process.env.AWS_SECRET) {
    console.log(process.env);
    console.log(env);
  }
  const response = await lambda.getFunction({ FunctionName: functionName });
  return response.Configuration.CodeSha256;
}

async function generateLocalHash(zipFilePath: string) {
  const fileData = await readFile(zipFilePath);
  return createHash('sha256').update(fileData).digest('base64');
}

function getFunctionsFromServerlessYml(): string[] {
  const serverlessYmlPath = path.resolve('./serverless.yml');
  const serverlessYmlContent = readFileSync(serverlessYmlPath, 'utf8');
  const serverlessConfig = yamlParser.load(serverlessYmlContent) as {
    functions: Record<string, unknown>;
  };
  return Object.keys(serverlessConfig.functions);
}

async function deployChangedServices(stage: string): Promise<void> {
  console.log('Packaging the service...');
  execSync(`serverless package --stage ${stage}`, { stdio: 'inherit' });

  const functions = getFunctionsFromServerlessYml();
  const serverlessDir = path.resolve('./.serverless');

  try {
    const files = await readdir(serverlessDir);
    console.log('Files in .serverless directory:', files);

    for (const functionName of functions) {
      const zipFileName = `${functionName}.zip`;
      const zipFilePath = files.includes(zipFileName)
        ? path.join(serverlessDir, zipFileName)
        : undefined;

      if (!zipFilePath || !existsSync(zipFilePath)) {
        console.warn(`.zip file for function "${functionName}" not found.`);
        continue; // Skip deployment for this function
      }

      const localHash = await generateLocalHash(zipFilePath);
      const deployedHash = await getDeployedLambdaHash(functionName);

      console.log(`Function: ${functionName}`);
      console.log('Deployed Hash:', deployedHash);
      console.log('Local Hash:', localHash);

      if (deployedHash !== localHash) {
        console.log(
          `Changes detected for function "${functionName}". Deploying...`,
        );
        execSync(
          `serverless deploy function --function ${functionName} --stage ${stage}`,
          { stdio: 'inherit' },
        );
      } else {
        console.log(
          `No changes detected for function "${functionName}". Skipping deployment.`,
        );
      }
    }
  } catch (err) {
    console.error('Error during deployment:', err);
    throw err;
  }
}

// Example usage
(async () => {
  const stage = process.argv[2];

  if (!stage) {
    console.error('Usage: node deploy.js <stage>');
    process.exit(1);
  }

  await deployChangedServices(stage);
})();
