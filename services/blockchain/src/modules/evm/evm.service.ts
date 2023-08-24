import {
  AppEnvironment,
  ChainType,
  env,
  EvmChain,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  TransactionStatus,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { LogOutput, sendToWorkerQueue } from '@apillon/workers-lib';
import { ethers } from 'ethers';
import { Endpoint } from '../../common/models/endpoint';
import { Transaction } from '../../common/models/transaction';
import { Wallet } from '../wallet/wallet.model';
import { BlockchainErrorCode } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { evmChainToJob } from '../../lib/helpers';
import { getWalletSeed } from '../../lib/seed';
import { transmitAndProcessEvmTransaction } from '../../lib/transmit-and-process-evm-transaction';
import { WorkerName } from '../../workers/worker-executor';

export class EvmService {
  static async createTransaction(
    {
      params,
    }: {
      params: {
        chain: EvmChain;
        fromAddress?: string;
        transaction: string;
        referenceTable?: string;
        referenceId?: string;
        project_uuid?: string;
      };
    },
    context: ServiceContext,
  ) {
    console.log('Params: ', params);
    // connect to chain
    // TODO: Add logic if endpoint is unavailable to fetch the backup one.
    const endpoint = await new Endpoint({}, context).populateByChain(
      params.chain,
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
    switch (params.chain) {
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
      if (params.fromAddress) {
        wallet = await wallet.populateByAddress(
          params.chain,
          ChainType.EVM,
          params.fromAddress,
          conn,
        );
      }

      // if address is not specified or not found then get the least used wallet
      if (!wallet.exists()) {
        wallet = await wallet.populateByLeastUsed(
          params.chain,
          ChainType.EVM,
          conn,
        );
      }

      if (!wallet.exists()) {
        throw new BlockchainCodeException({
          code: BlockchainErrorCode.WALLET_DOES_NOT_EXISTS,
          status: 500,
        });
      }

      // parse and set transaction information
      const unsignedTx = ethers.utils.parseTransaction(params.transaction);
      // TODO: add transaction checker to detect anomalies.
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
        data = ethers.utils.getContractAddress({
          from: wallet.address,
          nonce: wallet.nextNonce,
        });
      }

      // save transaction
      const transaction = new Transaction({}, context);
      transaction.populate({
        chain: params.chain,
        chainType: ChainType.EVM,
        address: wallet.address,
        to: unsignedTx.to,
        nonce: wallet.nextNonce,
        referenceTable: params.referenceTable,
        referenceId: params.referenceId,
        rawTransaction,
        data,
        transactionHash: ethers.utils.keccak256(rawTransaction),
        transactionStatus: TransactionStatus.PENDING,
        project_uuid: params.project_uuid,
      });
      await transaction.insert(SerializeFor.INSERT_DB, conn);
      await wallet.iterateNonce(conn);

      await conn.commit();

      if (
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
      ) {
        await transmitAndProcessEvmTransaction(context, provider, transaction);
      } else {
        try {
          await sendToWorkerQueue(
            env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
            WorkerName.TRANSMIT_EVM_TRANSACTION,
            [
              {
                chain: params.chain,
              },
            ],
            evmChainToJob(params.chain, WorkerName.TRANSMIT_EVM_TRANSACTION),
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
          transaction: params.transaction,
          chain: params.chain,
          chainType: ChainType.EVM,
          fromAddress: params.fromAddress,
          referenceTable: params.referenceTable,
          referenceId: params.referenceId,
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
    eventLogger: (options: any, output: LogOutput) => Promise<void>,
  ) {
    // console.log('transmitTransactions', _event);
    const wallets = await new Wallet({}, context).getWallets(
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

    for (const wallet of wallets) {
      const transactions = await new Transaction({}, context).getList(
        _event.chain,
        ChainType.EVM,
        wallet.address,
        wallet.lastProcessedNonce,
      );

      // continue to next wallet if there is no transactions!
      if (!transactions.length) {
        continue;
      }

      let latestSuccess = null;
      let transmitted = 0;

      for (const transaction of transactions) {
        try {
          await provider.sendTransaction(transaction.rawTransaction);
          latestSuccess = transaction.nonce;
          transmitted++;
        } catch (err) {
          if (eventLogger) {
            await eventLogger(
              {
                logType: LogType.ERROR,
                message: 'Error transmitting transaction!',
                service: ServiceName.BLOCKCHAIN,
                data: {
                  error: err,
                  wallet: wallet.address,
                },
                err,
              },
              LogOutput.NOTIFY_WARN,
            );
          } else {
            await new Lmas().writeLog({
              logType: LogType.ERROR,
              message: 'Error transmitting transaction',
              location: 'EvmService.transmitTransactions',
              service: ServiceName.BLOCKCHAIN,
              data: {
                error: err,
                wallet: wallet.address,
              },
            });
          }
          if (
            env.APP_ENV === AppEnvironment.TEST ||
            env.APP_ENV === AppEnvironment.LOCAL_DEV
          ) {
            throw err;
          }
          break;
        }
      }

      if (latestSuccess >= 0) {
        const dbWallet = new Wallet(wallet, context);
        await dbWallet.updateLastProcessedNonce(latestSuccess);
      }

      if (eventLogger) {
        await eventLogger(
          {
            logType: LogType.COST,
            message: 'EVM transactions submitted',
            service: ServiceName.BLOCKCHAIN,
            data: {
              wallet,
              numOfTransactions: transactions.length,
              transmitted,
            },
          },
          LogOutput.EVENT_INFO,
        );
      } else {
        await new Lmas().writeLog({
          context,
          logType: LogType.COST,
          message: 'EVM transactions submitted',
          location: `EvmService.transmitTransactions`,
          service: ServiceName.BLOCKCHAIN,
          data: {
            wallet,
            numOfTransactions: transactions.length,
            transmitted,
          },
        });
      }
    }
    // TODO: call transaction checker
  }
}
