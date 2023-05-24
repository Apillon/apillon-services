import { SqlModelStatus } from '@apillon/lib';
import { Collection } from '@apillon/nfts/src/modules/nfts/models/collection.model';
import { Transaction } from '@apillon/nfts/src/modules/transaction/models/transaction.model';
import {
  Stage,
  TestUser,
  createTestNFTCollection,
  createTestProject,
  createTestUser,
  releaseStage,
  startGanacheRPCServer,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';
import { CollectionStatus } from '@apillon/nfts/src/config/types';

describe('Storage bucket tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;

  let testProject: Project;
  let testProject2: Project;

  let testCollection: Collection;
  let newCollection: Collection;

  beforeAll(async () => {
    stage = await setupTest();
    await startGanacheRPCServer(stage);
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testProject2 = await createTestProject(testUser2, stage.devConsoleContext);

    testCollection = await createTestNFTCollection(
      testUser,
      stage.nftsContext,
      testProject,
      SqlModelStatus.INCOMPLETE,
      0,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Moonbeam NFT Collection tests', () => {
    test('User should be able to get collection list', async () => {
      const response = await request(stage.http)
        .get(`/nfts/collections?project_uuid=${testProject.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.status).toBeTruthy();
      expect(response.body.data.items[0]?.collection_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.symbol).toBeTruthy();
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.maxSupply).toBeTruthy();
      expect(response.body.data.items[0]?.mintPrice).toBe(0);
      expect(response.body.data.items[0]?.isDrop).toBe(0);
      expect(response.body.data.items[0]?.isSoulbound).toBe(0);
      expect(response.body.data.items[0]?.isRevokable).toBeTruthy();
      expect(response.body.data.items[0]?.dropStart).toBeTruthy();
      expect(response.body.data.items[0]?.reserve).toBeTruthy();
      expect(response.body.data.items[0]?.royaltiesFees).toBe(0);
      expect(response.body.data.items[0]?.royaltiesAddress).toBeTruthy();
      expect(response.body.data.items[0]?.collectionStatus).toBe(0);
      expect(response.body.data.items[0]?.contractAddress).toBeTruthy();
      expect(response.body.data.items[0]?.chain).toBeTruthy();
    });

    test('User should be able to get collection by id', async () => {
      const response = await request(stage.http)
        .get(`/nfts/collections/${testCollection.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.collection_uuid).toBe(
        testCollection.collection_uuid,
      );
      expect(response.body.data.symbol).toBe(testCollection.symbol);
      expect(response.body.data.name).toBe(testCollection.name);
      expect(response.body.data.maxSupply).toBe(testCollection.maxSupply);
      expect(response.body.data.mintPrice).toBe(testCollection.mintPrice);
      expect(response.body.data.baseUri).toBe(testCollection.baseUri);
      expect(response.body.data.baseExtension).toBe(
        testCollection.baseExtension,
      );
      expect(response.body.data.isDrop).toBe(testCollection.isDrop);
      expect(response.body.data.isSoulbound).toBe(testCollection.isSoulbound);
      expect(response.body.data.isRevokable).toBe(testCollection.isRevokable);
      expect(response.body.data.dropStart).toBe(testCollection.dropStart);
      expect(response.body.data.reserve).toBe(testCollection.reserve);
      expect(response.body.data.royaltiesFees).toBe(
        testCollection.royaltiesFees,
      );
    });

    test('User should be able to create new collection with existing baseURI', async () => {
      const response = await request(stage.http)
        .post(`/nfts/collections?project_uuid=${testProject.project_uuid}`)
        .send({
          symbol: 'TNFT',
          name: 'Test NFT Collection',
          maxSupply: 50,
          mintPrice: 0,
          project_uuid: testProject.project_uuid,
          baseUri:
            'https://ipfs2.apillon.io/ipns/k2k4r8maf9scf6y6cmyjd497l1ipmu2hystzngvdmvgduih78jfphht2/',
          baseExtension: 'json',
          isDrop: false,
          dropStart: 0,
          reserve: 5,
          chain: 1287,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      console.info(response.body.data);
      expect(response.body.data.contractAddress).toBeTruthy();

      //Get collection from DB
      newCollection = await new Collection({}, stage.nftsContext).populateById(
        response.body.data.id,
      );

      expect(newCollection.exists()).toBeTruthy();

      newCollection.status = CollectionStatus.DEPLOYED;
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

      //Check if new transactions exists
      const transaction: Transaction[] = await new Transaction(
        {},
        stage.nftsContext,
      ).getCollectionTransactions(newCollection.id, 1);

      expect(transaction.length).toBe(2);
    });
  });
});
