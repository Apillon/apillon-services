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
  let testProject: Project, nestableProject: Project;
  let testService: Service;
  let testCollection: Collection,
    transferredCollection: Collection,
    nestableCollection: Collection;
  let apiKey: ApiKey, nestedApiKey: ApiKey;
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

    // nestable collection
    const nestableUser = await createTestUser(
      stage.devConsoleContext,
      stage.amsContext,
    );
    nestableProject = await createTestProject(
      nestableUser,
      stage.devConsoleContext,
    );
    await overrideDefaultQuota(
      stage,
      nestableProject.project_uuid,
      QuotaCode.MAX_NFT_COLLECTIONS,
      10,
    );
    nestedApiKey = await createTestApiKey(
      stage.amsContext,
      nestableProject.project_uuid,
    );
    await nestedApiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: nestableProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.NFT,
      }),
    );
    await nestedApiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: nestableProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.NFT,
      }),
    );
    await nestedApiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: nestableProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.NFT,
      }),
    );

    nestableCollection = await createTestNFTCollection(
      nestableUser,
      stage.nftsContext,
      nestableProject,
      SqlModelStatus.INCOMPLETE,
      0,
      { collectionType: 2 },
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });
  describe('Moonbeam NFT Collection tests', () => {
    test('User should be able to get collection list', async () => {
      const response = await getRequest(
        `/nfts/collections?status=${CollectionStatus.DEPLOY_INITIATED}&search=${testCollection.name}`,
      );

      expect(response.status).toBe(200);
      const data = response.body.data;
      expect(data.items.length).toBe(1);
      const firstCollection = data.items[0];
      expect(firstCollection?.id).toBeTruthy();
      expect(firstCollection?.status).toBeTruthy();
      expect(firstCollection?.collectionUuid).toBeTruthy();
      expect(firstCollection?.symbol).toBeTruthy();
      expect(firstCollection?.name).toBeTruthy();
      expect(firstCollection?.maxSupply).toBeTruthy();
      expect(firstCollection?.dropPrice).toBe(0);
      expect(firstCollection?.drop).toBe(0);
      expect(firstCollection?.isSoulbound).toBe(0);
      expect(firstCollection?.isRevokable).toBeTruthy();
      expect(firstCollection?.dropStart).toBeTruthy();
      expect(firstCollection?.dropReserve).toBeTruthy();
      expect(firstCollection?.royaltiesFees).toBe(0);
      expect(firstCollection?.royaltiesAddress).toBeTruthy();
      expect(firstCollection?.collectionStatus).toBe(0);
      expect(firstCollection?.contractAddress).toBeTruthy();
      expect(firstCollection?.chain).toBeTruthy();
    });

    test('User should not be able to list collections from another project', async () => {
      const otherUser = await createTestUser(
        stage.devConsoleContext,
        stage.amsContext,
      );
      const otherProject = await createTestProject(
        otherUser,
        stage.devConsoleContext,
      );
      const otherService = await createTestProjectService(
        stage.devConsoleContext,
        otherProject,
      );
      const otherApiKey = await createTestApiKey(
        stage.amsContext,
        otherProject.project_uuid,
      );
      await otherApiKey.assignRole(
        new ApiKeyRoleBaseDto().populate({
          role_id: DefaultApiKeyRole.KEY_READ,
          project_uuid: otherProject.project_uuid,
          service_uuid: otherService.service_uuid,
          serviceType_id: AttachedServiceType.NFT,
        }),
      );

      const response = await getRequest('/nfts/collections', otherApiKey);

      expect(response.status).toBe(200);
      const data = response.body.data;
      expect(data.items.length).toBe(0);
    });

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
      expect(data.dropPrice).toBe(testCollection.dropPrice);
      expect(data.baseUri).toBe(testCollection.baseUri);
      expect(data.baseExtension).toBe(testCollection.baseExtension);
      expect(data.drop).toBe(testCollection.drop);
      expect(data.isSoulbound).toBe(testCollection.isSoulbound);
      expect(data.isRevokable).toBe(testCollection.isRevokable);
      expect(data.dropStart).toBe(testCollection.dropStart);
      expect(data.dropReserve).toBe(testCollection.dropReserve);
      expect(data.royaltiesFees).toBe(testCollection.royaltiesFees);
    });

    test('User should be able to create new collection with existing baseURI', async () => {
      const response = await postRequest('/nfts/collections', {
        collectionType: 1,
        symbol: 'TNFT',
        name: 'Test NFT Collection',
        maxSupply: 50,
        dropPrice: 0,
        project_uuid: testProject.project_uuid,
        baseUri: TEST_COLLECTION_BASE_URI,
        baseExtension: 'json',
        drop: false,
        dropStart: 0,
        dropReserve: 5,
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
      const response = await postRequest(
        `/nfts/collections/${testCollection.collection_uuid}/mint`,
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
      ).getCollectionTransactions(testCollection.id);
      expect(
        transaction.find((x) => x.transactionType == TransactionType.MINT_NFT),
      ).toBeTruthy();
    });

    test('User should be able to burn nestable collection NFT', async () => {
      const response = await postRequest(
        `/nfts/collections/${testCollection.collection_uuid}/burn`,
        { tokenId: 1 },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.success).toBe(true);
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
        dropPrice: 0,
        project_uuid: testProject.project_uuid,
        baseExtension: 'json',
        drop: false,
        dropStart: 0,
        dropReserve: 2,
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
  });

  describe('Astar NFT Collection tests', () => {
    test('User should be able to create new Astar collection with existing baseURI', async () => {
      const testCollectionName = 'Astar Created NFT Collection';
      const response = await postRequest('/nfts/collections', {
        collectionType: 1,
        symbol: 'ANFT',
        name: testCollectionName,
        maxSupply: 50,
        dropPrice: 0,
        project_uuid: testProject.project_uuid,
        baseUri: TEST_COLLECTION_BASE_URI,
        baseExtension: 'json',
        drop: false,
        dropStart: 0,
        dropReserve: 5,
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
        { collectionType: 1 },
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
        { collectionType: 1 },
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
      const newCollection = await createTestNFTCollection(
        testUser,
        stage.nftsContext,
        testProject,
        SqlModelStatus.DRAFT,
        CollectionStatus.CREATED,
        { collectionType: 1 },
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
        { collectionStatus: CollectionStatus.TRANSFERED, collectionType: 1 },
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

  describe('NFT Collection tests for nestable type', () => {
    test('User should be able to create nestable collection with existing baseURI', async () => {
      const testCollectionName = 'Nestable Created NFT Collection';
      const response = await postRequest(
        '/nfts/collections',
        {
          collectionType: 2,
          symbol: 'ANFT',
          name: testCollectionName,
          maxSupply: 50,
          dropPrice: 0,
          project_uuid: nestableProject.project_uuid,
          baseUri: TEST_COLLECTION_BASE_URI,
          baseExtension: 'json',
          drop: false,
          dropStart: 0,
          dropReserve: 5,
          chain: EvmChain.ASTAR,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        },
        nestedApiKey,
      );

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

    test('User should be able to get nestable collection transactions', async () => {
      const collection = await createTestNFTCollection(
        testUser,
        stage.nftsContext,
        nestableProject,
        SqlModelStatus.ACTIVE,
        CollectionStatus.CREATED,
        { collectionType: 2 },
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
        nestedApiKey,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.transactionHash).toBe(
        transaction.transactionHash,
      );
    });

    test('User should be able to mint nestable collection NFT', async () => {
      const response = await postRequest(
        `/nfts/collections/${nestableCollection.collection_uuid}/mint`,
        {
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 1,
        },
        nestedApiKey,
      );

      expect(response.status).toBe(201);
      //Check if new transactions exists
      const transaction: Transaction[] = await new Transaction(
        {},
        stage.nftsContext,
      ).getCollectionTransactions(nestableCollection.id);
      expect(
        transaction.find((x) => x.transactionType == TransactionType.MINT_NFT),
      ).toBeTruthy();
    });

    test('User should be able to nest mint NFT for nestable NFT', async () => {
      const parentCollectionResponse = await postRequest(
        '/nfts/collections',
        {
          collectionType: 2,
          symbol: 'ANFTN',
          name: 'Parent Collection',
          maxSupply: 50,
          dropPrice: 0,
          project_uuid: nestableProject.project_uuid,
          baseUri: TEST_COLLECTION_BASE_URI,
          baseExtension: 'json',
          drop: false,
          dropStart: 0,
          dropReserve: 5,
          chain: EvmChain.MOONBASE,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        },
        nestedApiKey,
      );
      expect(parentCollectionResponse.status).toBe(201);
      const parentCollection = parentCollectionResponse.body.data;
      const childCollectionResponse = await postRequest(
        '/nfts/collections',
        {
          collectionType: 2,
          symbol: 'ANFTN',
          name: 'Child Collection',
          maxSupply: 50,
          dropPrice: 0,
          project_uuid: nestableProject.project_uuid,
          baseUri: TEST_COLLECTION_BASE_URI,
          baseExtension: 'json',
          drop: false,
          dropStart: 0,
          dropReserve: 5,
          chain: EvmChain.MOONBASE,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        },
        nestedApiKey,
      );
      expect(childCollectionResponse.status).toBe(201);
      const childCollection = childCollectionResponse.body.data;

      const response = await postRequest(
        `/nfts/collections/${childCollection.collectionUuid}/nest-mint`,
        {
          destinationCollectionUuid: parentCollection.collectionUuid,
          destinationNftId: 1,
          quantity: 1,
        },
        nestedApiKey,
      );

      expect(response.status).toBe(201);
      expect(response.body.data.success).toBe(true);
      //Check if new transactions exists
      const transaction: Transaction[] = await new Transaction(
        {},
        stage.nftsContext,
      ).getCollectionTransactions(childCollection.id);
      expect(
        transaction.find(
          (x) => x.transactionType == TransactionType.NEST_MINT_NFT,
        ),
      ).toBeTruthy();
    });

    test('User should be able to transfer nestable NFT collection', async () => {
      const newCollection = await createTestNFTCollection(
        testUser,
        stage.nftsContext,
        nestableProject,
        SqlModelStatus.DRAFT,
        CollectionStatus.CREATED,
        { collectionType: 2 },
      );
      const response = await postRequest(
        `/nfts/collections/${newCollection.collection_uuid}/transfer`,
        {
          address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
        },
        nestedApiKey,
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

    test('User should NOT be able to Mint transferred nestable collection', async () => {
      const newCollection = await createTestNFTCollection(
        testUser,
        stage.nftsContext,
        nestableProject,
        SqlModelStatus.DRAFT,
        CollectionStatus.CREATED,
        { collectionStatus: CollectionStatus.TRANSFERED, collectionType: 2 },
      );

      const response = await postRequest(
        `/nfts/collections/${newCollection.collection_uuid}/mint`,
        {
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 1,
        },
        nestedApiKey,
      );

      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50012002);
    });

    test('User should be able to burn nestable collection NFT', async () => {
      const response = await postRequest(
        `/nfts/collections/${nestableCollection.collection_uuid}/burn`,
        { tokenId: 1 },
        nestedApiKey,
      );

      expect(response.status).toBe(201);
      expect(response.body.data.success).toBe(true);
    });
  });
});
