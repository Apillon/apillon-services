import {
  ChainType,
  NFTCollectionType,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  CollectionStatus,
  TransactionType,
} from '@apillon/nfts/src/config/types';
import { Collection } from '@apillon/nfts/src/modules/nfts/models/collection.model';
import {
  createTestProject,
  createTestUser,
  getNftTransactionStatus,
  insertNftContractVersion,
  releaseStage,
  Stage,
  substrateGenericNftAbi,
  TestSubstrateBlockchain,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';

describe('Apillon Console NFTs tests for Astar substrate', () => {
  const CHAIN_ID = SubstrateChain.ASTAR;
  let blockchain: TestSubstrateBlockchain;
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;
  let newCollection: Collection;

  beforeAll(async () => {
    stage = await setupTest();

    blockchain = TestSubstrateBlockchain.fromStage(stage, CHAIN_ID);
    await blockchain.start();

    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject = await createTestProject(testUser, stage);

    await insertNftContractVersion(
      stage.context.nfts,
      ChainType.SUBSTRATE,
      NFTCollectionType.GENERIC,
      substrateGenericNftAbi,
    );
  });

  describe('Astar substrate NFT Collection tests', () => {
    test('User should be able to create new Astar collection with existing baseURI', async () => {
      const response = await request(stage.http)
        .post('/nfts/collections/substrate')
        .send({
          collectionType: 1,
          chainType: ChainType.SUBSTRATE,
          symbol: 'ANFT',
          name: 'Astar Substrate Test NFT Collection',
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
          royaltiesAddress: 'WUxAYMWgkdyLYmGHio2YFPQqkjPUuwgdLvzweurbsgJxzdA',
          royaltiesFees: 0,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.collectionStatus).toBe(
        CollectionStatus.DEPLOYING,
      );
      expect(response.body.data.contractAddress).toBeTruthy();

      //Get collection from DB
      newCollection = await new Collection({}, stage.context.nfts).populateById(
        response.body.data.id,
      );
      expect(newCollection.exists()).toBeTruthy();
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        newCollection.collection_uuid,
        TransactionType.DEPLOY_CONTRACT,
      );
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
          receivingAddress: 'WUxAYMWgkdyLYmGHio2YFPQqkjPUuwgdLvzweurbsgJxzdA',
          quantity: 1,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
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
          address: 'WUxAYMWgkdyLYmGHio2YFPQqkjPUuwgdLvzweurbsgJxzdA',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
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
          receivingAddress: 'WUxAYMWgkdyLYmGHio2YFPQqkjPUuwgdLvzweurbsgJxzdA',
          quantity: 1,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50012002);
    });
  });

  afterAll(async () => {
    if (blockchain) {
      await blockchain.stop();
    }
    await releaseStage(stage);
  });
});
