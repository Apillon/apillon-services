import { QuotaCode, SqlModelStatus } from '@apillon/lib';
import {
  CollectionStatus,
  TransactionType,
} from '@apillon/nfts/src/config/types';
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
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';

describe('Storage bucket tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;

  let testProject: Project;

  let testCollection: Collection;
  let newCollection: Collection;

  beforeAll(async () => {
    stage = await setupTest();
    await startGanacheRPCServer(stage);
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);
    await createTestProject(testUser2, stage.devConsoleContext);

    testCollection = await createTestNFTCollection(
      testUser,
      stage.nftsContext,
      testProject,
      SqlModelStatus.INCOMPLETE,
      0,
    );

    await stage.configContext.mysql.paramExecute(`
    INSERT INTO override (status, quota_id, project_uuid,  object_uuid, package_id, value)
    VALUES 
      (
        5,
        ${QuotaCode.MAX_NFT_COLLECTIONS},
        '${testProject.project_uuid}',
        null, 
        null,
        '10'
      )
    `);
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
      expect(response.body.data.contractAddress).toBeTruthy();

      //Get collection from DB
      newCollection = await new Collection({}, stage.nftsContext).populateById(
        response.body.data.id,
      );

      expect(newCollection.exists()).toBeTruthy();

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

      //Check if new transactions exists
      const transaction: Transaction[] = await new Transaction(
        {},
        stage.nftsContext,
      ).getCollectionTransactions(newCollection.id);

      expect(
        transaction.find((x) => x.transactionType == TransactionType.MINT_NFT),
      ).toBeTruthy();
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

      //Check if new transactions exists
      const transaction: Transaction[] = await new Transaction(
        {},
        stage.nftsContext,
      ).getCollectionTransactions(newCollection.id);

      expect(
        transaction.find(
          (x) =>
            x.transactionType == TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
        ),
      ).toBeTruthy();
    });

    test('User should NOT be able to transfer NFT collection multiple times', async () => {
      const response = await request(stage.http)
        .post(
          `/nfts/collections/${newCollection.collection_uuid}/transferOwnership`,
        )
        .send({
          address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(400);
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

  describe('Moonbeam NFT Collection tests with metadata', () => {
    test('User should be able to create new collection without baseURI', async () => {
      const response = await request(stage.http)
        .post(`/nfts/collections?project_uuid=${testProject.project_uuid}`)
        .send({
          symbol: 'TNFT',
          name: 'Test NFT Collection',
          maxSupply: 2,
          mintPrice: 0,
          project_uuid: testProject.project_uuid,
          baseExtension: 'json',
          isDrop: false,
          dropStart: 0,
          reserve: 2,
          chain: 1287,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.bucket_uuid).toBeTruthy();

      //Get collection from DB
      newCollection = await new Collection({}, stage.nftsContext).populateById(
        response.body.data.id,
      );
      expect(newCollection.exists()).toBeTruthy();
    });

    test('User should be able to upload images and metadata files to bucket', async () => {
      //Images
      let response = await request(stage.http)
        .post(`/storage/${newCollection.bucket_uuid}/files-upload`)
        .send({
          files: [
            {
              fileName: '1.png',
              path: 'Images/',
            },
            {
              fileName: '2.png',
              path: 'Images/',
            },
          ],
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      newCollection.imagesSession = response.body.data.session_uuid;

      const file1Fur = response.body.data.files.find(
        (x) => x.fileName == '1.png',
      );
      const file2Fur = response.body.data.files.find(
        (x) => x.fileName == '2.png',
      );

      response = await request(file1Fur.url)
        .put(``)
        .send(`Image 1 ${new Date().toString()}`);
      expect(response.status).toBe(200);

      response = await request(file2Fur.url)
        .put(``)
        .send(`Image 2 ${new Date().toString()}`);
      expect(response.status).toBe(200);

      //Metadata
      response = await request(stage.http)
        .post(`/storage/${newCollection.bucket_uuid}/files-upload`)
        .send({
          files: [
            {
              fileName: '1.json',
              path: '',
            },
            {
              fileName: '2.json',
              path: '',
            },
          ],
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      newCollection.metadataSession = response.body.data.session_uuid;

      const jsonFile1Fur = response.body.data.files.find(
        (x) => x.fileName == '1.json',
      );
      const jsonFile2Fur = response.body.data.files.find(
        (x) => x.fileName == '2.json',
      );

      response = await request(jsonFile1Fur.url)
        .put(``)
        .send(
          `{"name":"NFT 1 Name","description":"NFT 1 Description","image":"1.png"}`,
        );
      expect(response.status).toBe(200);

      response = await request(jsonFile2Fur.url)
        .put(``)
        .send(
          `{"name":"NFT 2 Name","description":"NFT 2 Description","image":"2.png"}`,
        );
      expect(response.status).toBe(200);
    });

    test('User should be able to deploy NFT collection', async () => {
      const response = await request(stage.http)
        .post(`/nfts/collections/${newCollection.collection_uuid}/deploy`)
        .send({
          metadataSession: newCollection.metadataSession,
          imagesSession: newCollection.imagesSession,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);

      //Get collection from DB
      newCollection = await new Collection({}, stage.nftsContext).populateById(
        newCollection.id,
      );
      expect(newCollection.baseUri).toBeTruthy();

      //1.json should be available in baseUri
      const response2 = await request(newCollection.baseUri + '1.json').get('');
      expect(response2.status).toBe(200);

      //Bucket should contain 2 directories
      const collectionBucket = await new Bucket(
        {},
        stage.storageContext,
      ).populateByUUID(newCollection.bucket_uuid);

      const bucketDirs = await new Directory(
        {},
        stage.storageContext,
      ).populateDirectoriesInBucket(collectionBucket.id, stage.storageContext);
      expect(bucketDirs.length).toBe(2);

      const metadataDir = bucketDirs.find((x) => x.name == 'Metadata');
      expect(metadataDir).toBeTruthy();

      const collectionMetadataFiles: File[] = await new File(
        {},
        stage.storageContext,
      ).populateFilesInBucket(collectionBucket.id, stage.storageContext);

      expect(collectionMetadataFiles.length).toBe(4);
      expect(
        collectionMetadataFiles.find((x) => x.name == '1.json').directory_id,
      ).toBe(metadataDir.id);
    });
  });

  describe('NFT Collection limit tests', () => {
    test('User should NOT be able to mint more NFTs that are supplyed in collection', async () => {
      const response = await request(stage.http)
        .post(`/nfts/collections/${newCollection.collection_uuid}/mint`)
        .send({
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 3,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50012007);
    });

    test('User should NOT be able to create new collection in another user project', async () => {
      const response = await request(stage.http)
        .post(`/nfts/collections?project_uuid=${testProject.project_uuid}`)
        .send({
          symbol: 'TNFT',
          name: 'Test NFT Collection',
          maxSupply: 2,
          mintPrice: 0,
          project_uuid: testProject.project_uuid,
          baseExtension: 'json',
          isDrop: false,
          dropStart: 0,
          reserve: 2,
          chain: 1287,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });
  describe('Astar NFT Collection tests', () => {
    test('User should be able to create new Astar collection with existing baseURI', async () => {
      const response = await request(stage.http)
        .post(`/nfts/collections?project_uuid=${testProject.project_uuid}`)
        .send({
          symbol: 'ANFT',
          name: 'Astar Test NFT Collection',
          maxSupply: 50,
          mintPrice: 0,
          project_uuid: testProject.project_uuid,
          baseUri:
            'https://ipfs2.apillon.io/ipns/k2k4r8maf9scf6y6cmyjd497l1ipmu2hystzngvdmvgduih78jfphht2/',
          baseExtension: 'json',
          isDrop: false,
          dropStart: 0,
          reserve: 5,
          chain: 592,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.contractAddress).toBeTruthy();

      //Get collection from DB
      newCollection = await new Collection({}, stage.nftsContext).populateById(
        response.body.data.id,
      );

      expect(newCollection.exists()).toBeTruthy();

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

      //Check if new transactions exists
      const transaction: Transaction[] = await new Transaction(
        {},
        stage.nftsContext,
      ).getCollectionTransactions(newCollection.id);

      expect(
        transaction.find((x) => x.transactionType == TransactionType.MINT_NFT),
      ).toBeTruthy();
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

      //Check if new transactions exists
      const transaction: Transaction[] = await new Transaction(
        {},
        stage.nftsContext,
      ).getCollectionTransactions(newCollection.id);

      expect(
        transaction.find(
          (x) =>
            x.transactionType == TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
        ),
      ).toBeTruthy();
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
});
