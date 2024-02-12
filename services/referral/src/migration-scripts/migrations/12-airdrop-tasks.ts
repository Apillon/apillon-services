import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.AIRDROP_TASK}\` (
      \`user_uuid\` VARCHAR(36) NOT NULL,
      \`totalPoints\` INT NOT NULL DEFAULT 0,
      \`creditsSpent\` INT NOT NULL DEFAULT 0,
      \`usersReferred\` INT NOT NULL DEFAULT 0,
      \`projectCreated\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`bucketCreated\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`fileUploaded\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`websiteCreated\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`ipnsCreated\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`onSubscriptionPlan\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`creditsPurchased\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`grillChatCreated\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`nftCollectionCreated\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`domainLinked\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`websiteUploadedApi\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`fileUploadedApi\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`computingContractCreated\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`collaboratorAdded\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`kiltIdentityCreated\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`identitySdkUsed\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`nftMintedApi\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`user_uuid\`)
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.AIRDROP_TASK}\`;
  `);
}
