import { EvmChain, QuotaCode, TransactionStatus } from '@apillon/lib';
import {
  CollectionStatus,
  TransactionType,
} from '@apillon/nfts/src/config/types';
import { Collection } from '@apillon/nfts/src/modules/nfts/models/collection.model';
import {
  createTestProject,
  createTestUser,
  overrideDefaultQuota,
  releaseStage,
  Stage,
  TestBlockchain,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import {
  getNftTransactionStatus,
  setupTest,
} from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';

describe('Apillon Console NFTs tests for Astar', () => {
  const CHAIN_ID = EvmChain.ASTAR;
  let blockchain: TestBlockchain;
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;
  let newCollection: Collection;

  beforeAll(async () => {
    console.log('hrer1');
    stage = await setupTest();

    const blockchainStage = {
      db: stage.blockchainSql,
      context: stage.blockchainContext,
    };
    blockchain = new TestBlockchain(blockchainStage, CHAIN_ID);
    await blockchain.start();
    console.log('hrer2');

    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(testUser, stage);

    console.log('hrer3');
    await overrideDefaultQuota(
      stage,
      testProject.project_uuid,
      QuotaCode.MAX_NFT_COLLECTIONS,
      10,
    );
  });

  describe.only('Astar NFT Collection tests', () => {
    test.only('User should be able to create new Astar collection with existing baseURI', async () => {
      console.log('hrer4');
      const response = await request(stage.http)
        .post(`/nfts/collections?project_uuid=${testProject.project_uuid}`)
        .send({
          collectionType: 1,
          symbol: 'ANFT',
          name: 'Astar Test NFT Collection',
          maxSupply: 50,
          dropPrice: 0,
          project_uuid: testProject.project_uuid,
          baseUri:
            'https://ipfs2.apillon.io/ipns/k2k4r8maf9scf6y6cmyjd497l1ipmu2hystzngvdmvgduih78jfphht2/',
          baseExtension: 'json',
          drop: false,
          dropStart: 0,
          dropReserve: 5,
          chain: CHAIN_ID,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      console.log('hrer5');
      console.log(response.body);
      expect(response.status).toBe(201);
      expect(response.body.data.contractAddress).toBeTruthy();

      //Get collection from DB
      newCollection = await new Collection({}, stage.nftsContext).populateById(
        response.body.data.id,
      );
      expect(newCollection.exists()).toBeTruthy();
      const transactionStatus = await getNftTransactionStatus(
        stage,
        newCollection.collection_uuid,
        TransactionType.DEPLOY_CONTRACT,
      );
      console.log('hrer6');
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);

      newCollection.collectionStatus = CollectionStatus.DEPLOYED;
      await newCollection.update();
    });

    test('User should be able to get collection transactions', async () => {
      const response = await request(stage.http)
        .get(`/nfts/collections/${newCollection.collection_uuid}/transactions`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.transactionHash).toBeTruthy();
    });

    test('User should be able to mint NFT', async () => {
      const response = await request(stage.http)
        .post(`/nfts/collections/${newCollection.collection_uuid}/mint`)
        .send({
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 1,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        newCollection.collection_uuid,
        TransactionType.MINT_NFT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should be able to transfer NFT collection', async () => {
      const response = await request(stage.http)
        .post(
          `/nfts/collections/${newCollection.collection_uuid}/transferOwnership`,
        )
        .send({
          address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        newCollection.collection_uuid,
        TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should NOT be able to Mint transferred collection', async () => {
      newCollection.collectionStatus = CollectionStatus.TRANSFERED;
      await newCollection.update();

      const response = await request(stage.http)
        .post(`/nfts/collections/${newCollection.collection_uuid}/mint`)
        .send({
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 1,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50012002);
    });
  });

  afterAll(async () => {
    await blockchain.stop();
    await releaseStage(stage);
  });
});
