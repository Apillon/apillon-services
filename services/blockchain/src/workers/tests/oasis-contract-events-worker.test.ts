import { ChainType, EvmChain } from '@apillon/lib';
import { getConfig } from '@apillon/tests-lib';
import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { Endpoint } from '../../common/models/endpoint';
import { Contract } from '../../modules/contract/contract.model';
import { OasisContractEventsWorker } from '../oasis-contract-events-worker';

describe('Oasis contract events tests', () => {
  let stage: Stage;
  let config: any;
  let contract: Contract;

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();

    //Insert endpoint
    await new Endpoint({}, stage.context)
      .populate({
        url: 'https://testnet.sapphire.oasis.io',
        chain: EvmChain.OASIS_TESTNET,
        chainType: ChainType.EVM,
      })
      .insert();

    //Insert test contract
    contract = await new Contract({}, stage.context)
      .populate({
        address: '0xb1C945890247f9901d66eDa025B00dB7A08FEb72',
        chain: EvmChain.OASIS_TESTNET,
        chainType: ChainType.EVM,
        abi: `[
          "constructor()",
          "error AccessControlBadConfirmation()",
          "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
          "error AddressEmptyCode(address target)",
          "error DER_Split_Error()",
          "error ECDSAInvalidSignature()",
          "error ECDSAInvalidSignatureLength(uint256 length)",
          "error ECDSAInvalidSignatureS(bytes32 s)",
          "error ERC1967InvalidImplementation(address implementation)",
          "error ERC1967NonPayable()",
          "error FailedCall()",
          "error InvalidInitialization()",
          "error NotInitializing()",
          "error UUPSUnauthorizedCallContext()",
          "error UUPSUnsupportedProxiableUUID(bytes32 slot)",
          "error expmod_Error()",
          "error k256Decompress_Invalid_Length_Error()",
          "error k256DeriveY_Invalid_Prefix_Error()",
          "error recoverV_Error()",
          "event GaslessTransaction(bytes32 indexed dataHash, address indexed publicAddress)",
          "event Initialized(uint64 version)",
          "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
          "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
          "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
          "event Upgraded(address indexed implementation)",
          "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
          "function UPGRADE_INTERFACE_VERSION() view returns (string)",
          "function addWallet((bytes32 credentialIdHashed, (bytes authenticatorData, (uint8 t, string k, string v)[] clientDataTokens, uint256 sigR, uint256 sigS) resp, bytes data) args)",
          "function addWalletPassword((bytes32 hashedUsername, bytes32 digest, bytes data) args)",
          "function createAccount((bytes32 hashedUsername, bytes credentialId, (uint8 kty, int8 alg, uint8 crv, uint256 x, uint256 y) pubkey, bytes32 optionalPassword, (uint8 walletType, bytes32 keypairSecret) wallet) args)",
          "function credentialIdsByUsername(bytes32 in_hashedUsername) view returns (bytes[] out_credentialIds)",
          "function encryptedTx(bytes32 nonce, bytes ciphertext, uint256 timestamp, bytes32 dataHash)",
          "function gaspayingAddress() view returns (address)",
          "function generateGaslessTx(bytes in_data, uint64 nonce, uint256 gasPrice, uint64 gasLimit, uint256 timestamp, bytes signature) view returns (bytes out_data)",
          "function getAccount(bytes32 in_username, uint8 walletType) view returns (address)",
          "function getRoleAdmin(bytes32 role) view returns (bytes32)",
          "function grantRole(bytes32 role, address account)",
          "function hasRole(bytes32 role, address account) view returns (bool)",
          "function hashUsage(bytes32) view returns (bool)",
          "function initialize(address _accountFactory, address _signer) payable",
          "function manageCredential((bytes32 credentialIdHashed, (bytes authenticatorData, (uint8 t, string k, string v)[] clientDataTokens, uint256 sigR, uint256 sigS) resp, bytes data) args)",
          "function manageCredentialPassword((bytes32 hashedUsername, bytes32 digest, bytes data) args)",
          "function personalization() view returns (bytes32)",
          "function proxiableUUID() view returns (bytes32)",
          "function proxyView(bytes32 in_credentialIdHashed, (bytes authenticatorData, (uint8 t, string k, string v)[] clientDataTokens, uint256 sigR, uint256 sigS) in_resp, uint8 walletType, bytes in_data) view returns (bytes out_data)",
          "function proxyViewPassword(bytes32 in_hashedUsername, uint8 walletType, bytes32 in_digest, bytes in_data) view returns (bytes out_data)",
          "function removeWallet((bytes32 credentialIdHashed, (bytes authenticatorData, (uint8 t, string k, string v)[] clientDataTokens, uint256 sigR, uint256 sigS) resp, bytes data) args)",
          "function removeWalletPassword((bytes32 hashedUsername, bytes32 digest, bytes data) args)",
          "function renounceRole(bytes32 role, address callerConfirmation)",
          "function revokeRole(bytes32 role, address account)",
          "function salt() view returns (bytes32)",
          "function setSigner(address _signer)",
          "function signer() view returns (address)",
          "function supportsInterface(bytes4 interfaceId) view returns (bool)",
          "function upgradeToAndCall(address newImplementation, bytes data) payable",
          "function userExists(bytes32 in_username) view returns (bool)",
          "function validateSignature(uint256 _gasPrice, uint64 _gasLimit, uint256 _timestamp, bytes32 _dataKeccak, bytes _signature) view returns (bytes32, bool)"
        ]`,
        lastParsedBlock: 10_621_260,
        lastParsedBlockUpdateTime: new Date().setDate(
          new Date().getDate() - 10,
        ),
        minBalance: '0',
        decimals: 10,
        token: 'TEST',
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test.only('Test oasis contract event worker', async () => {
    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'oasis-contract-events-worker',
      {},
    );
    await new OasisContractEventsWorker(
      workerDefinition,
      stage.context,
    ).runExecutor({
      contractId: contract.id,
    });

    const tmpContract = await new Contract({}, stage.context).populateById(
      contract.id,
    );
    expect(tmpContract.lastParsedBlock).toBeGreaterThan(
      contract.lastParsedBlock,
    );
    expect(tmpContract.lastParsedBlockUpdateTime.getTime()).toBeGreaterThan(
      contract.lastParsedBlockUpdateTime.getTime(),
    );
    expect(tmpContract.lastParsedBlockTime).toBeTruthy();
  });

  test('Test oasis contract event balance alerting', async () => {
    contract.minBalance = '1000000000';
    contract.lastBalanceAlertTime = null;
    await contract.update();

    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'evm-contract-events-worker',
      {},
    );
    await new OasisContractEventsWorker(
      workerDefinition,
      stage.context,
    ).runExecutor({
      contractId: contract.id,
    });

    const tmpContract = await new Contract({}, stage.context).populateById(
      contract.id,
    );
    expect(tmpContract.lastBalanceAlertTime).toBeTruthy();

    //Another execution should not send another alert
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await new OasisContractEventsWorker(
      workerDefinition,
      stage.context,
    ).runExecutor({
      contractId: contract.id,
    });
    const tmpContract2 = await new Contract({}, stage.context).populateById(
      contract.id,
    );
    expect(tmpContract2.lastBalanceAlertTime.getTime()).toBe(
      tmpContract.lastBalanceAlertTime.getTime(),
    );
  });
});
