import path from 'path';
import fs from 'fs/promises';
import readline from 'readline';

type FileType = 'migration' | 'seed';

const getTargetMigrationFolder = (fileType: FileType) => {
  return path.join(process.cwd(), `src/migration-scripts/${fileType}s`);
};

const getFileType = (argument?: string) => {
  return argument === '--seed' ? 'seed' : 'migration';
};

const migrationTemplate = `
export async function upgrade(queryFn: (query: string, values?: any[]) => Promise<void>) {
  await queryFn(\`\`);
}
    
export async function downgrade(queryFn: (query: string, values?: any[]) => Promise<void>) {
  await queryFn(\`\`);
}
`;

async function run() {
  const timestamp = new Date().getTime();
  const readLineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const fileType = getFileType(process.argv[2]);

  readLineInterface.question(
    `Enter ${fileType} name: `,
    async (migrationName) => {
      const migrationFileName = `${timestamp}-${migrationName}.ts`;
      const migrationFilePath = path.join(
        getTargetMigrationFolder(fileType),
        migrationFileName,
      );
      await fs.writeFile(migrationFilePath, migrationTemplate);
      readLineInterface.close();
      console.log(
        `${fileType.charAt(0).toUpperCase() + fileType.substring(1)} file created at: ${migrationFilePath}`,
      );
      process.exit(0);
    },
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
