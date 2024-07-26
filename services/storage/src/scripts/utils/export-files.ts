import { MySql, env, runWithWorkers } from '@apillon/lib';
import * as fs from 'fs';
import axios from 'axios';
import { BucketType } from '../../config/types';

const UPLOAD_DESTINATION = '<insert_upload_path>';
const MIN_DATE = '2024-07-01';

const mysql = new MySql({
  host: env.STORAGE_MYSQL_HOST,
  port: env.STORAGE_MYSQL_PORT,
  database: env.STORAGE_MYSQL_DATABASE,
  user: env.STORAGE_MYSQL_USER,
  password: env.STORAGE_MYSQL_PASSWORD,
});

// Project UUIDs with subscription
const PROJECT_UUIDS_WITH_SUBSCRIPTION = [
  "'4ebbbca0-cc56-45a5-b25c-e4c822b9d603'",
  "'435b370d-3f19-4896-b6e5-fe9e1f3cff0d'",
  "'0ff5dc30-502b-49b0-997e-a70e3888f212'",
  "'7a0d3782-5a88-4f15-8b88-0513b97348c3'",
  "'1d0abe7f-c669-4b05-b908-e0918b6a7f6f'",
  "'0ff5dc30-502b-49b0-997e-a70e3888f212'",
  "'bd2dd87f-4cf3-488b-aabc-5f3343946a58'",
  "'3615ca46-7d42-4ed9-9c1a-3d5acdd4c653'",
  "'e76b258f-0ef2-408c-b87d-65419420551a'",
];

const getAuthToken = () => {
  const str = `${env.APILLON_API_INTEGRATION_API_KEY}:${env.APILLON_API_INTEGRATION_API_SECRET}`;
  return `Basic ${Buffer.from(str).toString('base64')}`;
};

async function exportFiles() {
  const files = await mysql.paramExecute(
    `SELECT file.CID, file.name
    FROM file
    LEFT JOIN bucket on bucket.id=file.bucket_id
    WHERE file.CID is not null AND
    bucket.bucketType <> ${BucketType.NFT_METADATA} AND
    (bucket.bucketType = ${BucketType.STORAGE} or bucket.project_uuid IN (${PROJECT_UUIDS_WITH_SUBSCRIPTION.join(',')})) AND
     file.createTime >= '${MIN_DATE}'`,
  );

  await runWithWorkers(files, 20, {}, async (file) => {
    const authToken = getAuthToken();

    const link = await axios.get<{
      id: string;
      status: number;
      data: {
        link: string;
      };
    }>(`${env.APILLON_API_URL}/storage/link-on-ipfs/` + file.CID, {
      headers: {
        Authorization: authToken,
      },
    });
    if (link.data.status === 200) {
      const destinationPath = UPLOAD_DESTINATION + '/' + file.name;
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
