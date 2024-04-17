import { setupTest } from '../../../../test/helpers/setup';
import {
  createTestApiKey,
  createTestNFTCollection,
  createTestProject,
  createTestProjectService,
  createTestUser,
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
  SqlModelStatus,
  TransactionStatus,
} from '@apillon/lib';
import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import { Collection } from '@apillon/nfts/src/modules/nfts/models/collection.model';
import { ContractVersion } from '@apillon/nfts/src/modules/nfts/models/contractVersion.model';
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
import { ethers } from 'ethers';
import { evmGenericNftAbi, evmNestableNftAbi } from '@apillon/tests-lib';
import {
  evmGenericNftBytecode,
  evmNestableNftBytecode,
} from '@apillon/tests-lib';

const TEST_COLLECTION_BASE_URI =
  'https://ipfs2.apillon.io/ipns/k2k4r8maf9scf6y6cmyjd497l1ipmu2hystzngvdmvgduih78jfphht2/';

let NESTABLE_NFT_INTERFACE;

describe('Apillon API NFTs tests', () => {
  const CHAIN_ID = EvmChain.MOONBASE;
  let blockchain: TestBlockchain;

  let stage: Stage;
  let testUser: TestUser;
  let testProject: Project, nestableProject: Project;
  let testService: Service;
  let genericCollection: Collection,
    nestableCollection: Collection,
    transferredCollection: Collection;
  let apiKey: ApiKey, nestableApiKey: ApiKey;
  let getRequest, postRequest;

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

    testProject = await createTestProject(testUser, stage, 50000);

    testService = await createTestProjectService(
      stage.context.devConsole,
      testProject,
    );

    const { id } = await new ContractVersion(
      {},
      stage.context.nfts,
    ).getContractVersion(NFTCollectionType.GENERIC);

    transferredCollection = await createTestNFTCollection(
      testUser,
      stage.context.nfts,
      testProject,
      SqlModelStatus.ACTIVE,
      CollectionStatus.DEPLOYED,
      {
        maxSupply: 0,
        chain: CHAIN_ID,
        contractVersion_id: id,
      },
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

    // nestable collection
    const nestableUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    nestableProject = await createTestProject(nestableUser, stage);
    nestableApiKey = await createTestApiKey(
      stage.context.access,
      nestableProject.project_uuid,
    );
    await nestableApiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: nestableProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.NFT,
      }),
    );
    await nestableApiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: nestableProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.NFT,
      }),
    );
    await nestableApiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: nestableProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.NFT,
      }),
    );

    const data = await stage.context.nfts.mysql.paramExecute(`
      SELECT abi
      FROM \`contract_version\`
      WHERE collectionType = ${NFTCollectionType.NESTABLE}
      AND chainType = ${ChainType.EVM}
      AND status = ${SqlModelStatus.ACTIVE}
      ORDER BY version DESC LIMIT 1
    `);
    NESTABLE_NFT_INTERFACE = new ethers.utils.Interface(data[0].abi);
  });

  describe('Moonbeam NFT Collection tests', () => {
    test('User should be able to create new collection with existing baseURI', async () => {
      const response = await postRequest('/nfts/collections', {
        collectionType: 1,
        symbol: 'TNFT',
        name: 'Test NFT Collection',
        maxSupply: 50,
        project_uuid: testProject.project_uuid,
        baseUri: TEST_COLLECTION_BASE_URI,
        baseExtension: 'json',
        drop: true,
        dropStart: 123,
        dropReserve: 5,
        dropPrice: 0.00001,
        chain: 1287,
        isRevokable: true,
        isSoulbound: false,
        royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
        royaltiesFees: 0,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.contractAddress).toBeTruthy();
      genericCollection = await new Collection(
        {},
        stage.context.nfts,
      ).populateByUUID(response.body.data.collectionUuid);
      expect(genericCollection.exists()).toBeTruthy();
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        genericCollection.collection_uuid,
        TransactionType.DEPLOY_CONTRACT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should be able to get collection list', async () => {
      const response = await getRequest(
        `/nfts/collections?status=${CollectionStatus.DEPLOYING}&search=${genericCollection.name}`,
      );

      expect(response.status).toBe(200);
      const data = response.body.data;
      expect(data.items.length).toBe(1);
      const firstCollection = data.items[0];
      expect(firstCollection?.collectionUuid).toBeTruthy();
      expect(firstCollection?.symbol).toBeTruthy();
      expect(firstCollection?.name).toBeTruthy();
      expect(firstCollection?.maxSupply).toBeTruthy();
      expect(firstCollection?.drop).toBe(true);
      expect(firstCollection?.dropStart).toBeTruthy();
      expect(firstCollection?.dropReserve).toBeTruthy();
      expect(firstCollection?.dropPrice).toBe(0.00001);
      expect(firstCollection?.isSoulbound).toBe(false);
      expect(firstCollection?.isRevokable).toBeTruthy();
      expect(firstCollection?.royaltiesFees).toBe(0);
      expect(firstCollection?.royaltiesAddress).toBeTruthy();
      expect(firstCollection?.collectionStatus).toBe(2);
      expect(firstCollection?.contractAddress).toBeTruthy();
      expect(firstCollection?.chain).toBeTruthy();
    });

    test('User should not be able to list collections from another project', async () => {
      const otherUser = await createTestUser(
        stage.context.devConsole,
        stage.context.access,
      );
      const otherProject = await createTestProject(otherUser, stage);
      const otherService = await createTestProjectService(
        stage.context.devConsole,
        otherProject,
      );
      const otherApiKey = await createTestApiKey(
        stage.context.access,
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
        `/nfts/collections/${genericCollection.collection_uuid}`,
      );

      const data = response.body.data;
      expect(response.status).toBe(200);
      expect(data.collectionUuid).toBe(genericCollection.collection_uuid);
      expect(data.symbol).toBe(genericCollection.symbol);
      expect(data.name).toBe(genericCollection.name);
      expect(data.maxSupply).toBe(genericCollection.maxSupply);
      expect(data.dropPrice).toBe(genericCollection.dropPrice);
      expect(data.baseUri).toBe(genericCollection.baseUri);
      expect(data.baseExtension).toBe(genericCollection.baseExtension);
      expect(data.drop).toBe(genericCollection.drop);
      expect(data.isSoulbound).toBe(genericCollection.isSoulbound);
      expect(data.isRevokable).toBe(genericCollection.isRevokable);
      expect(data.dropStart).toBe(genericCollection.dropStart);
      expect(data.dropReserve).toBe(genericCollection.dropReserve);
      expect(data.royaltiesFees).toBe(genericCollection.royaltiesFees);
    });

    test('User should be able to get collection transactions', async () => {
      const collection = await createTestNFTCollection(
        testUser,
        stage.context.nfts,
        testProject,
        SqlModelStatus.ACTIVE,
        CollectionStatus.CREATED,
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
      expect(response.body.data.items[0]?.transactionHash).toBeTruthy();
    });

    test('User should be able to mint NFT', async () => {
      const response = await postRequest(
        `/nfts/collections/${genericCollection.collection_uuid}/mint`,
        {
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 1,
        },
      );

      expect(response.status).toBe(201);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        genericCollection.collection_uuid,
        TransactionType.MINT_NFT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should be able to burn collection NFT', async () => {
      const response = await postRequest(
        `/nfts/collections/${genericCollection.collection_uuid}/burn`,
        { tokenId: 1 },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.success).toBe(true);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        genericCollection.collection_uuid,
        TransactionType.BURN_NFT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should be able to transfer NFT collection', async () => {
      const response = await postRequest(
        `/nfts/collections/${transferredCollection.collection_uuid}/transfer`,
        {
          address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
        },
      );

      expect(response.status).toBe(201);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        transferredCollection.collection_uuid,
        TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);

      transferredCollection.collectionStatus = CollectionStatus.TRANSFERED;
      await transferredCollection.update();
    });

    test('User should NOT be able to transfer NFT collection multiple times', async () => {
      const response = await postRequest(
        `/nfts/collections/${transferredCollection.collection_uuid}/transfer`,
        {
          address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
        },
      );

      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50012002);
    });

    test('User should NOT be able to Mint transferred collection', async () => {
      const response = await postRequest(
        `/nfts/collections/${transferredCollection.collection_uuid}/mint`,
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
        maxSupply: 4,
        dropPrice: 0,
        project_uuid: testProject.project_uuid,
        baseExtension: 'json',
        drop: true,
        dropStart: 123,
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
      test('User should NOT be able to mint more NFTs that are supplied in collection', async () => {
        const response = await postRequest(
          `/nfts/collections/${genericCollection.collection_uuid}/mint`,
          {
            receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
            quantity: genericCollection.maxSupply + 1,
          },
        );

        expect(response.status).toBe(422);
        expect(response.body.errors[0].code).toBe(42200123);
      });
    });
  });

  describe('NFT Collection versioning and ID mint tests', () => {
    let collectionUuid;
    test('Create collection with isAutoIncrement set to false', async () => {
      const response = await postRequest('/nfts/collections', {
        collectionType: 1,
        symbol: 'TNFT',
        name: 'Test NFT Collection',
        maxSupply: 50,
        project_uuid: testProject.project_uuid,
        baseUri: TEST_COLLECTION_BASE_URI,
        baseExtension: 'json',
        drop: true,
        dropStart: 123,
        dropReserve: 5,
        dropPrice: 0.00001,
        chain: 1287,
        isRevokable: true,
        isSoulbound: false,
        royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
        royaltiesFees: 0,
        isAutoIncrement: false,
      });

      const collection = await new Collection(
        {},
        stage.context.nfts,
      ).populateByUUID(response.body.data.collectionUuid);

      expect(collection.isAutoIncrement).toBeFalsy();
      expect(collection.contractVersion_id).toBeGreaterThanOrEqual(1); // Current default contract version from contract_version table

      collectionUuid = collection.collection_uuid;
    });

    test('Mint an NFT with custom token IDs', async () => {
      const response = await postRequest(
        `/nfts/collections/${collectionUuid}/mint`,
        {
          receivingAddress: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
          quantity: 2,
          idsToMint: [5, 10],
        },
      );
      expect(response.status).toBe(201);

      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        collectionUuid,
        TransactionType.MINT_NFT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });
  });

  describe('NFT Collection tests for nestable type', () => {
    test('User should be able to create nestable collection with existing baseURI', async () => {
      const testCollectionName = 'Nestable NFT Collection';
      const response = await postRequest(
        '/nfts/collections',
        {
          collectionType: 2,
          symbol: 'NNFT',
          name: testCollectionName,
          maxSupply: 0,
          dropPrice: 0.00001,
          project_uuid: nestableProject.project_uuid,
          baseUri: TEST_COLLECTION_BASE_URI,
          baseExtension: 'json',
          drop: true,
          dropStart: 123,
          dropReserve: 5,
          chain: CHAIN_ID,
          isRevokable: true,
          isSoulbound: false,
          royaltiesAddress: '0x452101C96A1Cf2cBDfa5BB5353e4a7F235241557',
          royaltiesFees: 0,
        },
        nestableApiKey,
      );

      expect(response.status).toBe(201);
      expect(response.body.data.contractAddress).toBeTruthy();
      nestableCollection = await new Collection(
        {},
        stage.context.nfts,
      ).populateByUUID(response.body.data.collectionUuid);
      expect(nestableCollection.exists()).toBeTruthy();
      expect(nestableCollection.name).toBe(testCollectionName);
      expect(nestableCollection.collectionStatus).toBe(
        CollectionStatus.DEPLOYING,
      );
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        nestableCollection.collection_uuid,
        TransactionType.DEPLOY_CONTRACT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should be able to get nestable collection transactions', async () => {
      const collection = await createTestNFTCollection(
        testUser,
        stage.context.nfts,
        nestableProject,
        SqlModelStatus.ACTIVE,
        CollectionStatus.CREATED,
        { collectionType: 2 },
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
        nestableApiKey,
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
        nestableApiKey,
      );

      expect(response.status).toBe(201);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        nestableCollection.collection_uuid,
        TransactionType.MINT_NFT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should be able to nest mint NFT for nestable NFT', async () => {
      const childCollectionResponse = await postRequest(
        '/nfts/collections',
        {
          collectionType: 2,
          symbol: 'CNFT',
          name: 'Child Collection',
          maxSupply: 50,
          dropPrice: 0,
          project_uuid: nestableProject.project_uuid,
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
        },
        nestableApiKey,
      );
      expect(childCollectionResponse.status).toBe(201);
      const childCollection = childCollectionResponse.body.data;

      const response = await postRequest(
        `/nfts/collections/${childCollection.collectionUuid}/nest-mint`,
        {
          parentCollectionUuid: nestableCollection.collection_uuid,
          parentNftId: 1,
          quantity: 1,
        },
        nestableApiKey,
      );

      expect(response.status).toBe(201);
      expect(response.body.data.success).toBe(true);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        childCollection.collectionUuid,
        TransactionType.NEST_MINT_NFT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should be able to transfer nestable NFT collection', async () => {
      const { id } = await new ContractVersion(
        {},
        stage.context.nfts,
      ).getContractVersion(NFTCollectionType.NESTABLE);

      const newCollection = await createTestNFTCollection(
        testUser,
        stage.context.nfts,
        nestableProject,
        SqlModelStatus.DRAFT,
        CollectionStatus.CREATED,
        { collectionType: 2, contractVersion_id: id },
      );
      const response = await postRequest(
        `/nfts/collections/${newCollection.collection_uuid}/transfer`,
        {
          address: '0xcC765934f460bf4Ba43244a36f7561cBF618daCa',
        },
        nestableApiKey,
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

    test('User should NOT be able to Mint transferred nestable collection', async () => {
      const newCollection = await createTestNFTCollection(
        testUser,
        stage.context.nfts,
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
        nestableApiKey,
      );

      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50012002);
    });

    test('User should be able to burn nestable collection NFT', async () => {
      const response = await postRequest(
        `/nfts/collections/${nestableCollection.collection_uuid}/burn`,
        { tokenId: 1 },
        nestableApiKey,
      );

      expect(response.status).toBe(201);
      expect(response.body.data.success).toBe(true);
      const transactionStatus = await getNftTransactionStatus(
        stage,
        CHAIN_ID,
        nestableCollection.collection_uuid,
        TransactionType.BURN_NFT,
      );
      expect(transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    test('User should not be able to burn nestable collection NFT with nest-minted child', async () => {
      //create parent collection
      const parentCollectionResponse = await postRequest(
        '/nfts/collections',
        {
          collectionType: 2,
          symbol: 'PNFT',
          name: 'Parent Collection',
          maxSupply: 50,
          dropPrice: 0,
          project_uuid: nestableProject.project_uuid,
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
        },
        nestableApiKey,
      );
      expect(parentCollectionResponse.status).toBe(201);
      const parentCollection = await new Collection(
        {},
        stage.context.nfts,
      ).populateByUUID(parentCollectionResponse.body.data.collectionUuid);
      //mint parent NFT
      const parentOwnerIndex = 0;
      const parentMintResponse = await postRequest(
        `/nfts/collections/${parentCollection.collection_uuid}/mint`,
        {
          receivingAddress: blockchain.getWalletAddress(parentOwnerIndex),
          quantity: 1,
        },
        nestableApiKey,
      );
      expect(parentMintResponse.status).toBe(201);
      //create child collection
      const childCollectionResponse = await postRequest(
        '/nfts/collections',
        {
          collectionType: 2,
          symbol: 'CNFT',
          name: 'Child Collection',
          maxSupply: 0,
          dropPrice: 0,
          project_uuid: nestableProject.project_uuid,
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
        },
        nestableApiKey,
      );
      expect(childCollectionResponse.status).toBe(201);
      const childCollection = await new Collection(
        {},
        stage.context.nfts,
      ).populateByUUID(childCollectionResponse.body.data.collectionUuid);
      //nest mint child under parent
      const nestMintResponse = await postRequest(
        `/nfts/collections/${childCollection.collection_uuid}/nest-mint`,
        {
          parentCollectionUuid: parentCollection.collection_uuid,
          parentNftId: 1,
          quantity: 1,
        },
        nestableApiKey,
      );
      expect(nestMintResponse.status).toBe(201);
      //accept nesting child on parent
      const acceptChildData = NESTABLE_NFT_INTERFACE.encodeFunctionData(
        'acceptChild',
        [
          1, //uint256 parentId
          0, //uint256 childIndex
          childCollection.contractAddress, //address childAddress
          1, //uint256 childId
        ],
      );
      const acceptChildTxHash = await blockchain.contractWrite(
        parentOwnerIndex,
        parentCollection.contractAddress,
        acceptChildData,
      );
      const acceptChildReceipt = await blockchain.getTransactionReceipt(
        acceptChildTxHash,
      );
      expect(acceptChildReceipt.status).toBe('0x1');

      const response = await postRequest(
        `/nfts/collections/${parentCollection.collection_uuid}/burn`,
        { tokenId: 1 },
        nestableApiKey,
      );

      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50012012);
      expect(response.body.message).toBe('Error burning NFT');
    });

    test('Customer should be able to mint NFT', async () => {
      const mintData = NESTABLE_NFT_INTERFACE.encodeFunctionData('mint', [
        '0xcC765934f460bf4Ba43244a36f7561cBF618daCa', // to,
        1, //numToMint
      ]);
      const mintTxHash = await blockchain.contractWrite(
        0,
        nestableCollection.contractAddress,
        mintData,
        nestableCollection.dropPrice,
      );
      const mintdReceipt = await blockchain.getTransactionReceipt(mintTxHash);
      expect(mintdReceipt.status).toBe('0x1');
    });
  });

  afterAll(async () => {
    if (blockchain) {
      await blockchain.stop();
    }
    await releaseStage(stage);
  });
});
