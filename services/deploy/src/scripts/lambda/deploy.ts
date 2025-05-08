import { execSync } from 'child_process';
import { readdir } from 'fs/promises';
import path from 'path';
import { yamlParser } from '@apillon/lib';
import { readFileSync } from 'fs';

function getFunctionsFromServerlessYml(): string[] {
  const serverlessYmlPath = path.resolve('./serverless.yml');
  const serverlessYmlContent = readFileSync(serverlessYmlPath, 'utf8');
  const serverlessConfig = yamlParser.load(serverlessYmlContent) as {
    functions: Record<string, unknown>;
  };
  return Object.keys(serverlessConfig.functions);
}

async function deployChangedServices(stage: string): Promise<void> {
  const fullDeploy = process.env.FULL_DEPLOY === 'true';

  if (fullDeploy) {
    console.log('FULL_DEPLOY is set. Performing full service deployment...');
    execSync(`serverless deploy --stage ${stage}`, { stdio: 'inherit' });
    return;
  }

  const functions = getFunctionsFromServerlessYml();
  const serverlessDir = path.resolve('./.serverless');

  try {
    const files = await readdir(serverlessDir);
    console.log('Files in .serverless directory:', files);

    for (const functionName of functions) {
      console.log(`Deploying function "${functionName}"...`);
      execSync(
        `serverless deploy function --function ${functionName} --stage ${stage}`,
        { stdio: 'inherit' },
      );
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
