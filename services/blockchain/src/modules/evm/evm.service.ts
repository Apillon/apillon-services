import {
  AppEnvironment,
  ChainType,
  EvmChain,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  TransactionStatus,
  env,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { ethers } from 'ethers';
import { Endpoint } from '../../common/models/endpoint';
import { Transaction } from '../../common/models/transaction';
import { Wallet } from '../../common/models/wallet';
import { BlockchainErrorCode } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { evmChainToJob } from '../../lib/helpers';
import { getWalletSeed } from '../../lib/seed';
import { transmitAndProcessEvmTransaction } from '../../lib/transmit-and-process-evm-transaction';
import { WorkerName } from '../../workers/worker-executor';

export class EvmService {
  static async createTransaction(
    _event: {
      params: {
        chain: EvmChain;
        fromAddress?: string;
        transaction: string;
        referenceTable?: string;
        referenceId?: string;
      };
    },
    context: ServiceContext,
  ) {
    console.log('Params: ', _event.params);
    // connect to chain
    // TODO: Add logic if endpoint is unavailable to fetch the backup one.
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.params.chain,
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

    let maxPriorityFeePerGas;
    let maxFeePerGas;
    let type;
    let gasPrice;
    let data = null;
    // eslint-disable-next-line sonarjs/no-small-switch
    switch (_event.params.chain) {
      case EvmChain.MOONBASE:
      case EvmChain.MOONBEAM: {
        maxPriorityFeePerGas = ethers.utils.parseUnits('3', 'gwei').toNumber();

        const estimatedBaseFee = (await provider.getGasPrice()).toNumber();
        console.log(estimatedBaseFee);
        // Ensuring that transaction is desirable for at least 6 blocks.
        // TODO: On production check how gas estimate is calculated
        maxFeePerGas = estimatedBaseFee * 2 + maxPriorityFeePerGas;
        type = 2;
        gasPrice = null;
        break;
      }
      case EvmChain.ASTAR:
      case EvmChain.ASTAR_SHIBUYA: {
        maxPriorityFeePerGas = ethers.utils.parseUnits('1', 'gwei').toNumber();

        const estimatedBaseFee = (await provider.getGasPrice()).toNumber();
        console.log(estimatedBaseFee);
        // Ensuring that transaction is desirable for at least 6 blocks.
        // TODO: On production check how gas estimate is calculated
        maxFeePerGas = estimatedBaseFee * 2 + maxPriorityFeePerGas;
        type = 2;
        gasPrice = null;
        break;
      }
      default: {
        throw new BlockchainCodeException({
          code: BlockchainErrorCode.INVALID_CHAIN,
          status: 400,
        });
      }
    }

    const conn = await context.mysql.start();

    try {
      let wallet = new Wallet({}, context);

      // if specific address is specified to be used for this transaction fetch the wallet
      if (_event.params.fromAddress) {
        wallet = await wallet.populateByAddress(
          _event.params.chain,
          ChainType.EVM,
          _event.params.fromAddress,
          conn,
        );
      }

      // if address is not specified or not found then get the least used wallet
      if (!wallet.exists()) {
        wallet = await wallet.populateByLeastUsed(
          _event.params.chain,
          ChainType.EVM,
          conn,
        );
      }

      // parse and set transaction information
      const unsignedTx = ethers.utils.parseTransaction(
        _event.params.transaction,
      );
      // TODO: add transaction checker to detect annomalies.
      // Reject transaction sending value etc.
      unsignedTx.from = wallet.address;
      unsignedTx.maxPriorityFeePerGas =
        ethers.BigNumber.from(maxPriorityFeePerGas);
      unsignedTx.maxFeePerGas = ethers.BigNumber.from(maxFeePerGas);
      unsignedTx.gasPrice = gasPrice;
      unsignedTx.type = type;
      unsignedTx.gasLimit = null;
      unsignedTx.chainId = wallet.chain;
      unsignedTx.nonce = wallet.nextNonce;

      const gas = await provider.estimateGas(unsignedTx);
      console.log(`Estimated gas=${gas}`);
      // Increasing gas limit by 10% of current gas price to be on the safe side
      const gasLimit = Math.floor(gas.toNumber() * 1.1);
      unsignedTx.gasLimit = ethers.BigNumber.from(gasLimit);

      // sign transaction
      const seed = await getWalletSeed(wallet.seed);
      const signingWallet = new ethers.Wallet(seed);
      console.log(unsignedTx);
      const rawTransaction = await signingWallet.signTransaction(unsignedTx);

      if (!unsignedTx.to) {
        data = getContractAddress(wallet.address, wallet.nextNonce);
      }

      // save transaction
      const transaction = new Transaction({}, context);
      transaction.populate({
        chain: _event.params.chain,
        chainType: ChainType.EVM,
        address: wallet.address,
        to: unsignedTx.to,
        nonce: wallet.nextNonce,
        referenceTable: _event.params.referenceTable,
        referenceId: _event.params.referenceId,
        rawTransaction,
        data,
        transactionHash: ethers.utils.keccak256(rawTransaction),
        transactionStatus: TransactionStatus.PENDING,
      });
      await transaction.insert(SerializeFor.INSERT_DB, conn);
      await wallet.iterateNonce(conn);

      await conn.commit();

      if (
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
      ) {
        await transmitAndProcessEvmTransaction(
          context,
          _event.params.chain,
          transaction,
        );
      } else {
        try {
          await sendToWorkerQueue(
            env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
            WorkerName.TRANSMIT_EVM_TRANSACTION,
            [
              {
                chain: _event.params.chain,
              },
            ],
            evmChainToJob(
              _event.params.chain,
              WorkerName.TRANSMIT_EVM_TRANSACTION,
            ),
            null,
          );
        } catch (e) {
          await new Lmas().writeLog({
            logType: LogType.ERROR,
            message: 'Error triggering TRANSMIT_EVM_TRANSACTION worker queue',
            location: 'EvmService.createTransaction',
            service: ServiceName.BLOCKCHAIN,
            data: {
              error: e,
            },
          });
        }
      }

      return transaction.serialize(SerializeFor.PROFILE);
    } catch (e) {
      console.log(e);
      //Write log to LMAS
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Error creating transaction',
        location: 'EvmService.createTransaction',
        service: ServiceName.BLOCKCHAIN,
        data: {
          error: e,
          transaction: _event.params.transaction,
          chain: _event.params.chain,
          chainType: ChainType.EVM,
          fromAddress: _event.params.fromAddress,
          referenceTable: _event.params.referenceTable,
          referenceId: _event.params.referenceId,
        },
      });
      await conn.rollback();
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ERROR_GENERATING_TRANSACTION,
        status: 500,
      });
    }
    //#region
  }

  static async getTransactionById(
    _event: {
      id: number;
    },
    context: ServiceContext,
  ) {
    const transaction = await new Transaction({}, context).populateById(
      _event.id,
    );
    if (!transaction.exists() || transaction.chainType != ChainType.EVM) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.TRANSACTION_NOT_FOUND,
        status: 404,
      });
    }
    return transaction.serialize(SerializeFor.PROFILE);
  }

  /**
   * @dev Ensure that only once instance of this method is running at the same time.
   * Should be called from worker
   * @param _event chain for which we should process transaction
   * @param context Service context
   */
  static async transmitTransactions(
    _event: {
      chain: EvmChain;
      address?: string;
    },
    context: ServiceContext,
  ) {
    console.log('transmitTransactions', _event);
    const wallets = await new Wallet({}, context).getList(
      _event.chain,
      ChainType.EVM,
      _event.address,
    );
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
      ChainType.EVM,
    );

    const provider = new ethers.providers.JsonRpcProvider(endpoint.url);
    // eslint-disable-next-line sonarjs/no-small-switch
    switch (_event.chain) {
      case EvmChain.MOONBASE:
      case EvmChain.MOONBEAM:
      case EvmChain.ASTAR: {
        break;
      }
      default: {
        throw new BlockchainCodeException({
          code: BlockchainErrorCode.INVALID_CHAIN,
          status: 400,
        });
      }
    }

    for (let i = 0; i < wallets.length; i++) {
      const transactions = await new Transaction({}, context).getList(
        _event.chain,
        ChainType.EVM,
        wallets[i].address,
        wallets[i].lastProcessedNonce,
      );
      let latestSuccess = null;
      try {
        for (let j = 0; j < transactions.length; j++) {
          await provider.sendTransaction(transactions[j].rawTransaction);
          latestSuccess = transactions[j].nonce;
        }
      } catch (e) {
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: 'Error transmiting transaction',
          location: 'EvmService.transmitTransactions',
          service: ServiceName.BLOCKCHAIN,
          data: {
            error: e,
            wallet: wallets[i].address,
          },
        });
        break;
      }
      if (latestSuccess) {
        const wallet = new Wallet(wallets[i], context);
        await wallet.updateLastProcessedNonce(latestSuccess);
      }
    }
    // TODO: call transaction checker
  }
}
function getContractAddress(address: string, nonce: number): string {
  const rlp_encoded = ethers.utils.RLP.encode([
    address,
    ethers.BigNumber.from(nonce.toString()).toHexString(),
  ]);
  const contract_address_long = ethers.utils.keccak256(rlp_encoded);
  const contract_address = '0x'.concat(contract_address_long.substring(26));
  return ethers.utils.getAddress(contract_address);
}
