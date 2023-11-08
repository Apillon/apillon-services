import { AppEnvironment, env, MySql } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { CID } from 'ipfs-http-client';
import { DbTables } from '../../config/types';

const options = {
  host:
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_MYSQL_HOST_TEST
      : env.STORAGE_MYSQL_HOST,
  port:
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_MYSQL_PORT_TEST
      : env.STORAGE_MYSQL_PORT,
  database:
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_MYSQL_DATABASE_TEST
      : env.STORAGE_MYSQL_DATABASE,
  user:
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_MYSQL_USER_TEST
      : env.STORAGE_MYSQL_USER,
  password:
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_MYSQL_PASSWORD_TEST
      : env.STORAGE_MYSQL_PASSWORD,
};

export async function run() {
  const context = new ServiceContext();
  const mysql = new MySql(options);
  await mysql.connect();
  context.setMySql(mysql);

  const filesWithoutCidV1 = await context.mysql.paramExecute(
    `
        SELECT *
        FROM \`${DbTables.FILE}\`
        WHERE CIDv1 IS NULL 
        AND CID IS NOT NULL
        `,
    {},
  );

  console.info(`Files to update: ${filesWithoutCidV1.length}`);

  await context.mysql.paramExecute(
    `
        CREATE TABLE IF NOT EXISTS tmp_cids (
          \`file_id\` INT NOT NULL,
          \`CID\` VARCHAR(255) NOT NULL,
          \`CIDv1\` VARCHAR(255) NOT NULL
        )
        `,
    {},
  );

  console.info('table created. Inserting cids...');

  for (let i = 0; i < filesWithoutCidV1.length; i += 500) {
    let insertSql = `INSERT INTO tmp_cids VALUES `;
    const chunk = filesWithoutCidV1.slice(i, i + 500);

    for (let j = 0; j < chunk.length; j++) {
      insertSql += `(${chunk[j].id}, '${chunk[j].CID}', '${CID.parse(
        chunk[j].CID,
      )
        .toV1()
        .toString()}'),`;
    }

    await context.mysql.paramExecute(
      insertSql.substring(0, insertSql.length - 1),
    );
  }

  console.info(
    'CID mappings inserted. Altering file table so that updateTime wont be updated...',
  );

  await context.mysql.paramExecute(`
    ALTER TABLE file
    CHANGE updateTime updateTime DATETIME NULL default current_timestamp;
  `);

  console.info('Updating CIDsV1...');

  await context.mysql.paramExecute(
    `
      UPDATE \`${DbTables.FILE}\` f
      INNER JOIN tmp_cids t ON t.file_id = f.id
      SET f.CIDv1 = t.CIDv1
      WHERE f.CIDv1 IS NULL 
      AND f.CID IS NOT NULL
      
        `,
    {},
  );

  console.info('Update successfull');

  await context.mysql.paramExecute(`
    ALTER TABLE file
    CHANGE updateTime updateTime DATETIME NULL default current_timestamp ON UPDATE CURRENT_TIMESTAMP;
  `);

  await context.mysql.paramExecute(`
    DROP TABLE tmp_cids;
  `);

  return { success: true };
}

run()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error(err);
  });
