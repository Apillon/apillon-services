import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.FILE_UPLOAD_REQUEST}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`session_id\` INT NOT NULL,
  \`bucket_id\` INT NOT NULL,
  \`directory_uuid\` VARCHAR(36) NULL,
  \`file_uuid\` VARCHAR(36) NOT NULL,
  \`path\` VARCHAR(500) NULL,
  \`s3FileKey\` VARCHAR(255) NOT NULL,
  \`fileName\` VARCHAR(255) NOT NULL,
  \`contentType\` VARCHAR(100) NOT NULL,
  \`fileStatus\` INT NOT NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_fileUploadRequest_fileUploadSession\`
        FOREIGN KEY (\`session_id\`)
        REFERENCES \`${DbTables.FILE_UPLOAD_SESSION}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
  CONSTRAINT \`fk_fileUploadRequest_bucket\`
        FOREIGN KEY (\`bucket_id\`)
        REFERENCES \`${DbTables.BUCKET}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.FILE_UPLOAD_REQUEST}\`;
  `);
}
