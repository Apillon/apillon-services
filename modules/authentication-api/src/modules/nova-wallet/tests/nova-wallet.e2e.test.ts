import { env } from '@apillon/lib';
import { Stage, releaseStage } from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';

describe('Nova wallet endpoints tests', () => {
  let stage: Stage;
  let fileUuid: string;

  beforeAll(async () => {
    //jest.setTimeout(100000); // Set timeout to 100 seconds
    stage = await setupTest();
    //Change bucket uuid to test one
    env.NOVA_WALLET_BUCKET_UUID = 'f1200f36-5add-4103-83d7-315cc00c14d3';
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Wallet tests', () => {
    test('User should recieve 422 error if invalid body is passed', async () => {
      const response = await request(stage.http).post('/wallets');
      expect(response.status).toBe(422);
    });

    test('User should recieve 422 error if invalid body is passed', async () => {
      const response = await request(stage.http).post('/wallets').send({
        wallets: 'Some invalid fake data, that I am trying to upload to IPFS',
      });
      expect(response.status).toBe(422);
    });

    test('User should be able to upload wallets to IPFS', async () => {
      const wallets = {
        'polkadot:b0a8d493285c2df73290dfb7e61f870f/slip44:434': {
          EJDj2GKnx89HTzUkGW8Rk9RoYUmAJHPM8aacWFp3fi1gYUQ: {
            description: 'Personal account',
          },
        },
        'polkadot:411f057b9107718c9624d6aa4a3f23c1/slip44:2086': {
          '4nvZhWv71x8reD9gq7BUGYQQVvTiThnLpTTanyru9XckaeWa': {
            description: 'Council account',
          },
          '4tMSjvHfWBNQw4tYGvkbRp7BBpwAB6S24LuMDcASYgnGnRTM': {
            description: 'Personal account',
          },
        },
        'polkadot:91b171bb158e2d3848fa23a9f1c25182/slip44:354': {
          '15BQbTH5bKH63WCXTMPxbmpnWeXKpfuTKbpDkfFLXMPvpxD3': {
            description: 'Personal account',
          },
        },
        'eip:1/slip44:60': {
          '0x6b175474e89094c44da98b954eedeac495271d0f': {},
          '0x8f8221AFBB33998D8584A2B05749BA73C37A938A': {
            description: 'NFT sales',
          },
        },
      };
      const response = await request(stage.http).post('/wallets').send({
        wallets,
      });
      expect(response.status).toBe(201);
      expect(response.body.data.fileUuid).toBeTruthy();
      fileUuid = response.body.data.fileUuid;
    });

    test('User should be able to query file status', async () => {
      const response = await request(stage.http).get(`/wallets/${fileUuid}`);
      expect(response.status).toBe(200);
      expect(response.body.data.fileStatus).toBeTruthy();
      expect(response.body.data.file.fileUuid).toBe(fileUuid);
      expect(response.body.data.file.size).toBeGreaterThan(0);
    });

    test('File should get CID after some time', async () => {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 60000);
      });

      const response = await request(stage.http).get(`/wallets/${fileUuid}`);
      expect(response.status).toBe(200);
      expect(response.body.data.file.CID).toBeTruthy();
    });
  });
});
