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
  TestBlockchain,
  TestUser,
  getNftTransactionStatus,
  insertNftContractVersion,
} from '@apillon/tests-lib';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  ChainType,
  DefaultApiKeyRole,
  NFTCollectionType,
  QuotaCode,
  SqlModelStatus,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import { Collection } from '@apillon/nfts/src/modules/nfts/models/collection.model';
import {
  CollectionStatus,
  TransactionType,
} from '@apillon/nfts/src/config/types';
import { Transaction } from '@apillon/nfts/src/modules/transaction/models/transaction.model';
import { EvmChain } from '@apillon/lib/src/config/types';
import {
  getRequestFactory,
  postRequestFactory,
} from '@apillon/tests-lib/src/lib/helpers/requests';
import { evmGenericNftAbi, evmNestableNftAbi } from '@apillon/tests-lib';
import {
  evmGenericNftBytecode,
  evmNestableNftBytecode,
} from '@apillon/tests-lib';

const TEST_COLLECTION_BASE_URI =
  'https://ipfs2.apillon.io/ipns/k2k4r8maf9scf6y6cmyjd497l1ipmu2hystzngvdmvgduih78jfphht2/';

describe('Apillon API NFTs tests on Astar', () => {
  const CHAIN_ID = EvmChain.ASTAR;
  let blockchain: TestBlockchain;
  let stage: Stage;
  let testUser: TestUser;
  let testProject: Project;
  let testService: Service;
  let apiKey: ApiKey;
  let getRequest, postRequest;
  let newCollection: Collection;

  beforeAll(async () => {
    stage = await setupTest();

    blockchain = TestBlockchain.fromStage(stage, CHAIN_ID);
    await blockchain.start();

    await insertNftContractVersion(
      stage.context.nfts,
      ChainType.EVM,
      NFTCollectionType.GENERIC,
      evmGenericNftAbi,
      evmGenericNftBytecode,
    );
    await insertNftContractVersion(
      stage.context.nfts,
      ChainType.EVM,
      NFTCollectionType.NESTABLE,
      evmNestableNftAbi,
      evmNestableNftBytecode,
    );

    //User 1 project & other data
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.stage.context.access,
    );

    testProject = await createTestProject(testUser, stage);
    await overrideDefaultQuota(
      stage,
      testProject.project_uuid,
      QuotaCode.MAX_NFT_COLLECTIONS,
      10,
    );

    testService = await createTestProjectService(
      stage.context.devConsole,
      testProject,
    );

    apiKey = await createTestApiKey(
      stage.stage.context.access,
      testProject.project_uuid,
    );
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
        chain: CHAIN_ID,
        isRevokable: true,
        isSoulbound: false,
        royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
        royaltiesFees: 0,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.contractAddress).toBeTruthy();
      newCollection = await new Collection(
        {},
        stage.context.nfts,
      ).populateByUUID(response.body.data.collectionUuid);
      expect(newCollection.exists()).toBeTruthy();
      expect(newCollection.name).toBe(testCollectionName);
      expect(newCollection.collectionStatus).toBe(CollectionStatus.DEPLOYING);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        newCollection.collection_uuid,
        TransactionType.DEPLOY_CONTRACT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should be able to get collection transactions', async () => {
      const collection = await createTestNFTCollection(
        testUser,
        stage.context.nfts,
        testProject,
        SqlModelStatus.ACTIVE,
        CollectionStatus.CREATED,
        { collectionType: 1 },
      );
      const transaction = new Transaction({}, stage.context.nfts).populate({
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
      const response = await postRequest(
        `/nfts/collections/${newCollection.collection_uuid}/mint`,
        {
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 1,
        },
      );

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
      const response = await postRequest(
        `/nfts/collections/${newCollection.collection_uuid}/transfer`,
        {
          address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
        },
      );

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
      const newCollection = await createTestNFTCollection(
        testUser,
        stage.context.nfts,
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

  describe('Astar Substrate (WASM) NFT collection tests', () => {
    test('User should be able to create new Astar Substrate', async () => {
      const testCollectionName = 'Astar Created NFT Collection';
      const response = await postRequest('/nfts/collections/substrate', {
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
        chain: SubstrateChain.ASTAR,
        royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
        royaltiesFees: 0,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.contractAddress).toBeTruthy();
      newCollection = await new Collection(
        {},
        stage.context.nfts,
      ).populateByUUID(response.body.data.collectionUuid);

      expect(newCollection.exists()).toBeTruthy();
      expect(newCollection.name).toBe(testCollectionName);
      expect(newCollection.collectionStatus).toBe(CollectionStatus.DEPLOYING);
      expect(newCollection.isRevokable).toBe(false);
      expect(newCollection.isSoulbound).toBe(false);
      expect(newCollection.isAutoIncrement).toBe(true);

      const transactionStatus = await getNftTransactionStatus(
        stage,
        SubstrateChain.ASTAR,
        newCollection.collection_uuid,
        TransactionType.DEPLOY_CONTRACT,
      );

      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });
  });

  afterAll(async () => {
    if (blockchain) {
      await blockchain.stop();
    }
    await releaseStage(stage);
  });
});
