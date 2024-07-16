import { MySql, env, runWithWorkers } from '@apillon/lib';
import * as fs from 'fs';
import axios from 'axios';

const uploadDestination = env.FILE_EXPORT_DESTINATION;
const mysql = new MySql({
  host: env.STORAGE_MYSQL_HOST,
  port: env.STORAGE_MYSQL_PORT,
  database: env.STORAGE_MYSQL_DATABASE,
  user: env.STORAGE_MYSQL_USER,
  password: env.STORAGE_MYSQL_PASSWORD,
});

async function exportFiles() {
  const files = await mysql.paramExecute(
    `SELECT file_uuid, s3FileKey, createUser, CID, name FROM file WHERE CID is not null and createTime >= '2024-07-01' order by createTime desc`,
  );

  await runWithWorkers(files, 20, {}, async (file) => {
    const link = await axios.get<{
      id: string;
      status: number;
      data: {
        link: string;
      };
    }>(`${env.APILLON_API_URL}/storage/link-on-ipfs/` + file.CID, {
      headers: {
        Authorization: env.APILLON_API_ACCESS_TOKEN,
      },
    });
    if (link.data.status === 200) {
      const destinationPath = uploadDestination + '/' + file.name;
      const url = link.data.data.link;
      try {
        console.log('fetching', file.name);
        const res = await axios.get(url, {
          responseType: 'stream',
          timeout: 30000,
        });
        res.data.pipe(fs.createWriteStream(destinationPath));
        console.log('done', file.name);
      } catch (error) {
        console.error('Failed to download file ', file.name);
      }
    }
  });
}

async function run() {
  await mysql.connect();
  await exportFiles();
  await mysql.close();
}

run()
  .then(() => {
    console.log('done');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
