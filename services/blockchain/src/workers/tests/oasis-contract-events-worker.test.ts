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
        address: '0x510518EBe8266fDF6858d2852ADA3bfE50988DAB',
        chain: EvmChain.OASIS_TESTNET,
        chainType: ChainType.EVM,
        abi: `[
          "constructor(address _signer)",
          "error DER_Split_Error()",
          "error ECDSAInvalidSignature()",
          "error ECDSAInvalidSignatureLength(uint256 length)",
          "error ECDSAInvalidSignatureS(bytes32 s)",
          "error expmod_Error()",
          "error k256Decompress_Invalid_Length_Error()",
          "error k256DeriveY_Invalid_Prefix_Error()",
          "error recoverV_Error()",
          "event GaslessTransaction(bytes32 indexed dataHash, bytes32 indexed hashedUsername, address indexed publicAddress)",
          "function createAccount((bytes32 hashedUsername, bytes credentialId, (uint8 kty, int8 alg, uint8 crv, uint256 x, uint256 y) pubkey, bytes32 optionalPassword) args)",
          "function credentialIdsByUsername(bytes32 in_hashedUsername) view returns (bytes[] out_credentialIds)",
          "function devAddress() view returns (address)",
          "function encryptedTx(bytes32 nonce, bytes ciphertext, uint256 timestamp, bytes32 dataHash)",
          "function gaspayingAddress() view returns (address)",
          "function generateGaslessTx(bytes in_data, uint64 nonce, uint256 gasPrice, uint64 gasLimit, uint256 timestamp, bytes signature) view returns (bytes out_data)",
          "function getAccount(bytes32 in_username) view returns (address account, address keypairAddress)",
          "function manageCredential((bytes32 credentialIdHashed, (bytes authenticatorData, (uint8 t, string k, string v)[] clientDataTokens, uint256 sigR, uint256 sigS) resp, bytes data) args)",
          "function manageCredentialPassword((bytes32 digest, bytes data) args)",
          "function personalization() view returns (bytes32)",
          "function proxyView(bytes32 in_credentialIdHashed, (bytes authenticatorData, (uint8 t, string k, string v)[] clientDataTokens, uint256 sigR, uint256 sigS) in_resp, bytes in_data) view returns (bytes out_data)",
          "function proxyViewPassword(bytes32 in_hashedUsername, bytes32 in_digest, bytes in_data) view returns (bytes out_data)",
          "function salt() view returns (bytes32)",
          "function setSigner(address _signer)",
          "function signer() view returns (address)",
          "function userExists(bytes32 in_username) view returns (bool)",
          "function validateSignature(uint256 _gasPrice, uint256 _timestamp, bytes32 _dataKeccak, bytes _signature) view returns (bytes32, bool)"
        ]`,
        lastParsedBlock: 10458732,
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

  test('Test oasis contract event worker', async () => {
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
