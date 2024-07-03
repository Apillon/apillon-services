import { env, MySql, runWithWorkers } from '@apillon/lib';
import axios from 'axios';

const mysql = new MySql({
  host: env.STORAGE_MYSQL_HOST,
  port: env.STORAGE_MYSQL_PORT,
  database: env.STORAGE_MYSQL_DATABASE,
  user: env.STORAGE_MYSQL_USER,
  password: env.STORAGE_MYSQL_PASSWORD,
});

async function republishIpns() {
  const ipnsRecs = await mysql.paramExecute(`
    SELECT * 
    FROM ipns 
    ORDER BY id 
    DESC LIMIT 100 
  `);
  console.time('IPNS');
  const keys = (await axios.post(`${process.env.STORAGE_IPFS_API}key/list`))
    .data?.Keys as Array<any>;
  let i = 0;
  // for (const ipns of ipnsRecs) {
  await runWithWorkers(ipnsRecs, 10, {}, async (ipns, ctx) => {
    // find key -- keys shold be in the database
    const key = keys.find((x) => x.Id === ipns.ipnsName);
    if (!!key) {
      // console.log(key);
      // console.time('KEY');
      // const result =
      await axios.post(
        `${
          process.env.STORAGE_IPFS_API
        }name/publish?arg=${ipns.ipnsValue.replace('/ipfs/', '')}&key=${
          key.Name
        }`,
      );
      // console.timeEnd('KEY');
      console.log(ipns.ipnsName);
      // console.log(result);
      i++;
    }
  });
  console.timeEnd('IPNS');
  console.log(`Updated ${i} IPNS keys!`);
}

async function republishWebsites() {
  const buckets = await mysql.paramExecute(`
    SELECT * 
    FROM bucket
    WHERE IPNS IS NOT NULL 
    ORDER BY id 
    DESC LIMIT 100 
  `);
  console.time('WEBSITES');
  const keys = (await axios.post(`${process.env.STORAGE_IPFS_API}key/list`))
    .data?.Keys as Array<any>;
  let i = 0;
  // for (const bucket of buckets) {
  await runWithWorkers(buckets, 10, {}, async (bucket, ctx) => {
    // find key -- keys shold be in the database
    const key = keys.find((x) => x.Id === bucket.IPNS);
    if (!!key) {
      // console.log(key);
      // console.time('KEY');
      // const result =
      await axios.post(
        `${process.env.STORAGE_IPFS_API}name/publish?arg=${bucket.CID}&key=${key.Name}&resolve=false&ttl=0h5m0s`,
      );
      // console.timeEnd('KEY');
      console.log(bucket.IPNS);
      // console.log(result);
      i++;
    }
  });
  console.timeEnd('WEBSITES');
  console.log(`Updated ${i} WEBSITE keys!`);
}

async function republishCustom() {
  const buckets = await mysql.paramExecute(`
  SELECT * FROM website w
  join ipns i 
  on w.productionBucket_id = i.bucket_id
  where domain is not null
  ;
  `);
  console.time('WEBSITES');
  let i = 0;
  for (const bucket of buckets) {
    // await runWithWorkers(buckets, 10, {}, async (bucket, ctx) => {
    // find key -- keys shold be in the database
    console.log(bucket);
    const key = bucket.key;
    if (!!key) {
      // console.log(key);
      // console.time('KEY');
      const result = await axios.post(
        `${process.env.STORAGE_IPFS_API}name/publish?arg=${bucket.cid}&key=${key}&resolve=false&ttl=0h5m0s`,
      );
      // console.timeEnd('KEY');
      console.log(bucket.ipnsName);
      console.log(result);
      i++;
    }
    // });
  }
  console.timeEnd('WEBSITES');
  console.log(`Updated ${i} WEBSITE keys!`);
}

async function run() {
  await mysql.connect();
  console.time('PROMiSE');
  // await Promise.all([republishIpns(), republishWebsites()]);
  // await republishIpns();
  // await republishWebsites();
  await republishCustom();
  console.timeEnd('PROMiSE');
}

run()
  .then(() => {
    console.log('DONE');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
