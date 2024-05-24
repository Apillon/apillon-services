import {
  AppEnvironment,
  ChainType,
  Context,
  env,
  EvmChain,
  LogType,
  PoolConnection,
  ServiceName,
  TransactionStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  LogOutput,
  sendToWorkerQueue,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Transaction } from '../common/models/transaction';
import { Wallet } from '../modules/wallet/wallet.model';
import { BlockchainErrorCode, DbTables } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import { BlockchainStatus } from '../modules/blockchain-indexers/blockchain-status';
import {
  EvmTransfer,
  EvmTransfers,
} from '../modules/blockchain-indexers/evm/data-models/evm-transfer';
import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
import { WorkerName } from './worker-executor';
import { ethers } from 'ethers';
import { Endpoint } from '../common/models/endpoint';

export class EvmContractEventsWorker extends BaseSingleThreadWorker {
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runExecutor(data: any): Promise<any> {
    /*this.contractAddress = data?.contractId;
    this.chain = data?.chain;
    if (!this.contractAddress || !this.chain) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }*/

    const contractData = {
      contractAddress: '0xcec1147b494d47F33B27b2F553c37526a4D3f0bb',
      chain: EvmChain.OASIS,
      abi: [
        'constructor(address _signer)',
        'error DER_Split_Error()',
        'error ECDSAInvalidSignature()',
        'error ECDSAInvalidSignatureLength(uint256 length)',
        'error ECDSAInvalidSignatureS(bytes32 s)',
        'error expmod_Error()',
        'error k256Decompress_Invalid_Length_Error()',
        'error k256DeriveY_Invalid_Prefix_Error()',
        'error recoverV_Error()',
        'event GaslessTransaction(bytes32 dataHash)',
        'function createAccount((bytes32 hashedUsername, bytes credentialId, (uint8 kty, int8 alg, uint8 crv, uint256 x, uint256 y) pubkey, bytes32 optionalPassword) args)',
        'function credentialIdsByUsername(bytes32 in_hashedUsername) view returns (bytes[] out_credentialIds)',
        'function devAddress() view returns (address)',
        'function encryptedTx(bytes32 nonce, bytes ciphertext, uint256 timestamp, bytes32 dataHash)',
        'function gaspayingAddress() view returns (address)',
        'function generateGaslessTx(bytes in_data, uint64 nonce, uint256 gasPrice, uint256 timestamp, bytes signature) view returns (bytes out_data)',
        'function getAccount(bytes32 in_username) view returns (address account, address keypairAddress)',
        'function manageCredential((bytes32 credentialIdHashed, (bytes authenticatorData, (uint8 t, string k, string v)[] clientDataTokens, uint256 sigR, uint256 sigS) resp, bytes data) args)',
        'function manageCredentialPassword((bytes32 digest, bytes data) args)',
        'function personalization() view returns (bytes32)',
        'function proxyView(bytes32 in_credentialIdHashed, (bytes authenticatorData, (uint8 t, string k, string v)[] clientDataTokens, uint256 sigR, uint256 sigS) in_resp, bytes in_data) view returns (bytes out_data)',
        'function proxyViewPassword(bytes32 in_hashedUsername, bytes32 in_digest, bytes in_data) view returns (bytes out_data)',
        'function salt() view returns (bytes32)',
        'function setSigner(address _signer)',
        'function signer() view returns (address)',
        'function userExists(bytes32 in_username) view returns (bool)',
        'function validateSignature(uint256 _gasPrice, uint256 _timestamp, bytes32 _dataKeccak, bytes _signature) view returns (bytes32, bool)',
      ],
      lastParsedBlock: 6422380,
      blockParseSize: 50,
    };

    //provider
    const endpoint = await new Endpoint({}, this.context).populateByChain(
      contractData.chain,
      ChainType.EVM,
    );

    if (!endpoint.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_CHAIN,
        status: 400,
      });
    }

    console.log('Endpoint: ', endpoint.url);
    const provider = new ethers.providers.JsonRpcProvider(endpoint.url);

    const fromBlock = contractData.lastParsedBlock + 1;
    const currentBlock = (await provider.getBlockNumber()) - 2; // we wait 2 block for confirmation
    let toBlock = fromBlock + contractData.blockParseSize;
    if (toBlock > currentBlock) {
      toBlock = currentBlock;
    }

    const contract = new ethers.Contract(
      contractData.contractAddress,
      contractData.abi,
      provider,
    );

    const events = await contract.queryFilter(
      'GaslessTransaction',
      fromBlock,
      toBlock,
    );

    console.info(events);
    console.info(events.length);
  }
}
