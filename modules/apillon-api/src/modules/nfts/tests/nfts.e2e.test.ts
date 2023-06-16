import { setupTest } from '../../../../test/helpers/setup';
import {
  createTestApiKey,
  createTestNFTCollection,
  createTestProject,
  createTestProjectService,
  createTestUser,
  overrideDefaultQuota,
  releaseStage,
  Stage,
  startGanacheRPCServer,
  TestUser,
} from '@apillon/tests-lib';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  DefaultApiKeyRole,
  QuotaCode,
  SqlModelStatus,
} from '@apillon/lib';
import { ApiKey } from '@apillon/access/dist/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import { Collection } from '@apillon/nfts/src/modules/nfts/models/collection.model';
import {
  CollectionStatus,
  TransactionType,
} from '@apillon/nfts/dist/config/types';
import { Transaction } from '@apillon/nfts/src/modules/transaction/models/transaction.model';
import { EvmChain } from '@apillon/lib/src/config/types';
import {
  getRequestFactory,
  postRequestFactory,
} from '@apillon/tests-lib/dist/lib/helpers/requests';

const TEST_COLLECTION_BASE_URI =
  'https://ipfs2.apillon.io/ipns/k2k4r8maf9scf6y6cmyjd497l1ipmu2hystzngvdmvgduih78jfphht2/';

describe('Apillon API NFTs tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;
  let testService: Service;
  let testCollection: Collection;
  let transferredCollection: Collection;
  let apiKey: ApiKey = undefined;
  let getRequest, postRequest;

  beforeAll(async () => {
    stage = await setupTest();
    await startGanacheRPCServer(stage);
    //User 1 project & other data
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);
    await overrideDefaultQuota(
      stage,
      testProject.project_uuid,
      QuotaCode.MAX_NFT_COLLECTIONS,
      10,
    );

    testService = await createTestProjectService(
      stage.devConsoleContext,
      testProject,
    );
    testCollection = await createTestNFTCollection(
      testUser,
      stage.nftsContext,
      testProject,
      SqlModelStatus.ACTIVE,
      CollectionStatus.CREATED,
      { baseUri: TEST_COLLECTION_BASE_URI },
    );

    transferredCollection = await createTestNFTCollection(
      testUser,
      stage.nftsContext,
      testProject,
      SqlModelStatus.DRAFT,
      CollectionStatus.CREATED,
    );

    apiKey = await createTestApiKey(stage.amsContext, testProject.project_uuid);
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.NFT,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.NFT,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.NFT,
      }),
    );

    getRequest = getRequestFactory(stage.http, apiKey);
    postRequest = postRequestFactory(stage.http, apiKey);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });
  describe('Moonbeam NFT Collection tests', () => {
    test('User should be able to get collection by uuid', async () => {
      const response = await getRequest(
        `/nfts/collections/${testCollection.collection_uuid}`,
      );

      const data = response.body.data;
      expect(response.status).toBe(200);
      expect(data.id).toBeTruthy();
      expect(data.collectionUuid).toBe(testCollection.collection_uuid);
      expect(data.symbol).toBe(testCollection.symbol);
      expect(data.name).toBe(testCollection.name);
      expect(data.maxSupply).toBe(testCollection.maxSupply);
      expect(data.mintPrice).toBe(testCollection.mintPrice);
      expect(data.baseUri).toBe(testCollection.baseUri);
      expect(data.baseExtension).toBe(testCollection.baseExtension);
      expect(data.isDrop).toBe(testCollection.isDrop);
      expect(data.isSoulbound).toBe(testCollection.isSoulbound);
      expect(data.isRevokable).toBe(testCollection.isRevokable);
      expect(data.dropStart).toBe(testCollection.dropStart);
      expect(data.reserve).toBe(testCollection.reserve);
      expect(data.royaltiesFees).toBe(testCollection.royaltiesFees);
    });

    test('User should be able to create new collection with existing baseURI', async () => {
      const response = await postRequest('/nfts/collections', {
        symbol: 'TNFT',
        name: 'Test NFT Collection',
        maxSupply: 50,
        mintPrice: 0,
        project_uuid: testProject.project_uuid,
        baseUri: TEST_COLLECTION_BASE_URI,
        baseExtension: 'json',
        isDrop: false,
        dropStart: 0,
        reserve: 5,
        chain: 1287,
        isRevokable: true,
        isSoulbound: false,
        royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
        royaltiesFees: 0,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.contractAddress).toBeTruthy();
      const createdCollection = await new Collection(
        {},
        stage.nftsContext,
      ).populateById(response.body.data.id);
      expect(createdCollection.exists()).toBeTruthy();
    });

    test('User should be able to get collection transactions', async () => {
      const collection = await createTestNFTCollection(
        testUser,
        stage.nftsContext,
        testProject,
        SqlModelStatus.ACTIVE,
        CollectionStatus.CREATED,
      );
      const transaction = new Transaction({}, stage.nftsContext).populate({
        chainId: 123,
        transactionType: TransactionType.MINT_NFT,
        transactionHash: 'transaction_hash',
        refTable: 'collection',
        refId: collection.id,
      });
      await transaction.insert();

      const response = await getRequest(
        `/nfts/collections/${collection.collection_uuid}/transactions`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.transactionHash).toBeTruthy();
    });

    test('User should be able to mint NFT', async () => {
      const newCollection = await createTestNFTCollection(
        testUser,
        stage.nftsContext,
        testProject,
        SqlModelStatus.DRAFT,
        CollectionStatus.CREATED,
      );

      const response = await postRequest(
        `/nfts/collections/${newCollection.collection_uuid}/mint`,
        {
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 1,
        },
      );

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
      const response = await postRequest(
        `/nfts/collections/${transferredCollection.collection_uuid}/transfer`,
        {
          address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
        },
      );

      expect(response.status).toBe(201);
      //Check if new transactions exists
      const transaction: Transaction[] = await new Transaction(
        {},
        stage.nftsContext,
      ).getCollectionTransactions(transferredCollection.id);
      expect(
        transaction.find(
          (x) =>
            x.transactionType == TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
        ),
      ).toBeTruthy();
    });

    test('User should NOT be able to transfer NFT collection multiple times', async () => {
      const response = await postRequest(
        `/nfts/collections/${transferredCollection.collection_uuid}/transfer`,
        {
          address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
        },
      );

      expect(response.status).toBe(400);
    });

    test('User should NOT be able to Mint transferred collection', async () => {
      const newCollection = await createTestNFTCollection(
        testUser,
        stage.nftsContext,
        testProject,
        SqlModelStatus.DRAFT,
        CollectionStatus.CREATED,
        { collectionStatus: CollectionStatus.TRANSFERED },
      );

      const response = await postRequest(
        `/nfts/collections/${newCollection.collection_uuid}/mint`,
        {
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 1,
        },
      );

      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50012002);
    });

    test('User should NOT be able to Mint transferred collection', async () => {
      const newCollection = await createTestNFTCollection(
        testUser,
        stage.nftsContext,
        testProject,
        SqlModelStatus.DRAFT,
        CollectionStatus.CREATED,
        { collectionStatus: CollectionStatus.TRANSFERED },
      );

      const response = await postRequest(
        `/nfts/collections/${newCollection.collection_uuid}/mint`,
        {
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 1,
        },
      );

      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50012002);
    });
  });

  describe('Moonbeam NFT Collection tests with metadata', () => {
    test('User should not be able to create new collection without baseURI', async () => {
      const response = await postRequest('/nfts/collections', {
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
      });

      expect(response.status).toBe(422);
    });

    describe('NFT Collection limit tests', () => {
      test('User should NOT be able to mint more NFTs that are supplyed in collection', async () => {
        const response = await postRequest(
          `/nfts/collections/${testCollection.collection_uuid}/mint`,
          {
            receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
            quantity: testCollection.maxSupply + 1,
          },
        );

        expect(response.status).toBe(500);
        expect(response.body.code).toBe(50012007);
      });
    });

    describe('Astar NFT Collection tests', () => {
      test('User should be able to create new Astar collection with existing baseURI', async () => {
        const testCollectionName = 'Astar Created NFT Collection';
        const response = await postRequest('/nfts/collections', {
          symbol: 'ANFT',
          name: testCollectionName,
          maxSupply: 50,
          mintPrice: 0,
          project_uuid: testProject.project_uuid,
          baseUri: TEST_COLLECTION_BASE_URI,
          baseExtension: 'json',
          isDrop: false,
          dropStart: 0,
          reserve: 5,
          chain: EvmChain.ASTAR,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        });

        expect(response.status).toBe(201);
        expect(response.body.data.contractAddress).toBeTruthy();
        const createdCollection = await new Collection(
          {},
          stage.nftsContext,
        ).populateById(response.body.data.id);
        expect(createdCollection.exists()).toBeTruthy();
        expect(createdCollection.name).toBe(testCollectionName);
        expect(createdCollection.collectionStatus).toBe(
          CollectionStatus.DEPLOYING,
        );
      });

      test('User should be able to get collection transactions', async () => {
        const collection = await createTestNFTCollection(
          testUser,
          stage.nftsContext,
          testProject,
          SqlModelStatus.ACTIVE,
          CollectionStatus.CREATED,
        );
        const transaction = new Transaction({}, stage.nftsContext).populate({
          chainId: 123,
          transactionType: TransactionType.MINT_NFT,
          transactionHash: 'transaction_hash',
          refTable: 'collection',
          refId: collection.id,
        });
        await transaction.insert();

        const response = await getRequest(
          `/nfts/collections/${collection.collection_uuid}/transactions`,
        );

        expect(response.status).toBe(200);
        expect(response.body.data.items.length).toBe(1);
        expect(response.body.data.items[0]?.transactionHash).toBe(
          transaction.transactionHash,
        );
      });

      test('User should be able to mint NFT', async () => {
        const newCollection = await createTestNFTCollection(
          testUser,
          stage.nftsContext,
          testProject,
          SqlModelStatus.DRAFT,
          CollectionStatus.CREATED,
        );

        const response = await postRequest(
          `/nfts/collections/${newCollection.collection_uuid}/mint`,
          {
            receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
            quantity: 1,
          },
        );

        expect(response.status).toBe(201);
        //Check if new transactions exists
        const transaction: Transaction[] = await new Transaction(
          {},
          stage.nftsContext,
        ).getCollectionTransactions(newCollection.id);
        expect(
          transaction.find(
            (x) => x.transactionType == TransactionType.MINT_NFT,
          ),
        ).toBeTruthy();
      });

      test('User should be able to transfer NFT collection', async () => {
        const newCollection = await createTestNFTCollection(
          testUser,
          stage.nftsContext,
          testProject,
          SqlModelStatus.DRAFT,
          CollectionStatus.CREATED,
        );
        const response = await postRequest(
          `/nfts/collections/${newCollection.collection_uuid}/transfer`,
          {
            address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          },
        );

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
        const newCollection = await createTestNFTCollection(
          testUser,
          stage.nftsContext,
          testProject,
          SqlModelStatus.DRAFT,
          CollectionStatus.CREATED,
          { collectionStatus: CollectionStatus.TRANSFERED },
        );

        const response = await postRequest(
          `/nfts/collections/${newCollection.collection_uuid}/mint`,
          {
            receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
            quantity: 1,
          },
        );

        expect(response.status).toBe(500);
        expect(response.body.code).toBe(50012002);
      });
    });
  });
});
