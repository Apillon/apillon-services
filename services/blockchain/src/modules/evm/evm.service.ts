import {
  AppEnvironment,
  ChainType,
  env,
  EvmChain,
  getEnumKey,
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
import { BlockchainErrorCode } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { evmChainToWorkerName, WorkerType } from '../../lib/helpers';
import { getWalletSeed } from '../../lib/seed';
import { transmitAndProcessEvmTransaction } from '../../lib/transmit-and-process-evm-transaction';
import { Wallet } from '../wallet/wallet.model';

export async function getNextOnChainNonce(
  provider: ethers.providers.JsonRpcProvider,
  walletAddress: string,
) {
  return await provider.getTransactionCount(walletAddress, 'pending');
}

async function trySelfRepairNonce(
  provider: ethers.providers.JsonRpcProvider,
  context: ServiceContext,
  wallet: Wallet,
) {
  const nextOnChainNonce = await getNextOnChainNonce(provider, wallet.address);
  if (!nextOnChainNonce) {
    return;
  }
  const lastProcessedNonce = nextOnChainNonce - 1;
  if (wallet.lastProcessedNonce > lastProcessedNonce) {
    return;
  }
  const lastTx = await new Transaction(
    {},
    context,
  ).getLastTransactionByChainWalletAndNonce(
    wallet.chain,
    wallet.address,
    lastProcessedNonce,
  );
  if (!lastTx) {
    return;
  }

  const lastOnChainTx = await provider.getTransaction(lastTx.transactionHash);
  if (
    lastOnChainTx.from !== wallet.address ||
    lastOnChainTx.nonce !== lastProcessedNonce
  ) {
    return;
  }

  return lastProcessedNonce;
}

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
        minimumGas?: number;
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
      let gasLimit = Math.floor(gas.toNumber() * 1.1);
      // Override gas limit in transaction with minimum.
      // This is useful for transactions like minting before contract is deployed on chain where
      // estimate gas would return a much to low limit since it would assume normal transfer.
      if (
        params.minimumGas &&
        params.minimumGas > gasLimit &&
        gasLimit < 30000
      ) {
        gasLimit = params.minimumGas;
      }
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
            evmChainToWorkerName(params.chain, WorkerType.TRANSMIT),
            [
              {
                chain: params.chain,
              },
            ],
            null,
            null,
          );
        } catch (e) {
          await new Lmas().writeLog({
            logType: LogType.ERROR,
            message: `Error triggering TRANSMIT_EVM_TRANSACTION worker queue: ${e}`,
            location: 'EvmService.createTransaction',
            service: ServiceName.BLOCKCHAIN,
            data: {
              error: e,
            },
            sendAdminAlert: true,
          });
        }
      }

      return transaction.serialize(SerializeFor.PROFILE);
    } catch (e) {
      console.log(e);
      await conn.rollback();
      // Write log to LMAS
      throw await new BlockchainCodeException({
        code: BlockchainErrorCode.ERROR_GENERATING_TRANSACTION,
        errorMessage: `Error creating EVM transaction: ${e}`,
        sourceFunction: 'EvmService.createTransaction',
        status: 500,
      }).writeToMonitor({
        logType: LogType.ERROR,
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
        sendAdminAlert: true,
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
   * @param eventLogger Event logger
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
      if (!transactions.length) {
        continue;
      }

      let latestSuccess = null;
      let transmitted = 0;

      for (const transaction of transactions) {
        if (
          [
            TransactionStatus.CONFIRMED,
            TransactionStatus.FAILED,
            TransactionStatus.ERROR,
          ].includes(transaction.transactionStatus)
        ) {
          latestSuccess = transaction.nonce;
          await eventLogger(
            {
              logType: LogType.INFO,
              message: `Transaction with id ${transaction.id} was skipped since it had final status in DB (last success nonce was bumped to transaction nonce).`,
              service: ServiceName.BLOCKCHAIN,
              data: {
                transactionId: transaction.id,
                latestSuccess,
              },
            },
            LogOutput.EVENT_INFO,
          );
          continue;
        }
        try {
          const result = await provider.sendTransaction(
            transaction.rawTransaction,
          );
          console.log(
            `successfully transmitted tx with id ${transaction.id}:`,
            result,
          );
          latestSuccess = transaction.nonce;
          transmitted++;
        } catch (err) {
          const chainName = getEnumKey(EvmChain, _event.chain);
          if (
            err?.reason === 'nonce has already been used' ||
            err?.error?.message === 'already known'
          ) {
            const selfRepairNonce = await trySelfRepairNonce(
              provider,
              context,
              wallet,
            );
            latestSuccess = selfRepairNonce;
            if (selfRepairNonce) {
              await eventLogger(
                {
                  logType: LogType.INFO,
                  message: `Last success nonce was repaired on chain ${chainName} for wallet address ${wallet.address} and set to ${selfRepairNonce} (hash=${transaction.transactionHash}).`,
                  service: ServiceName.BLOCKCHAIN,
                  data: {
                    selfRepairNonce,
                    wallet: wallet.address,
                  },
                },
                LogOutput.EVENT_INFO,
              );
            } else {
              await eventLogger(
                {
                  logType: LogType.ERROR,
                  message: `Could not repair last success nonce on chain ${chainName} for wallet address ${wallet.address} (nonce=${transaction.nonce}, hash=${transaction.transactionHash}).`,
                  service: ServiceName.BLOCKCHAIN,
                  data: {
                    wallet: wallet.address,
                    walletLastProcessedNonce: wallet.lastProcessedNonce,
                    transactionNonce: transaction.nonce,
                    selfRepairNonce,
                  },
                },
                LogOutput.NOTIFY_WARN,
              );
              // stop transmitting TX after first self repair
              break;
            }
          } else {
            await eventLogger(
              {
                logType: LogType.ERROR,
                message: `Error transmitting transaction on chain ${chainName}! Hash: ${transaction.transactionHash}`,
                service: ServiceName.BLOCKCHAIN,
                data: {
                  error: err,
                  wallet: wallet.address,
                },
                err,
              },
              LogOutput.NOTIFY_WARN,
            );
            // stop transmitting TX after first exception
            if (
              env.APP_ENV === AppEnvironment.TEST ||
              env.APP_ENV === AppEnvironment.LOCAL_DEV
            ) {
              throw err;
            }
            break;
          }
        }
      }

      if (latestSuccess !== null) {
        const dbWallet = new Wallet(wallet, context);
        await dbWallet.updateLastProcessedNonce(latestSuccess);
      }
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
    }
    // TODO: call transaction checker
  }

  /**
   * Create signature for Evm Oasis chain
   * @param params timestamp, chain and data to be signed
   * @param context
   * @returns
   */
  static async createOasisSignature(
    params: { data: string; timestamp: number },
    context: ServiceContext,
  ) {
    //validate data
    try {
      const abiCoder = ethers.utils.defaultAbiCoder;
      const decodedFuncData = abiCoder.decode(
        ['tuple(bytes funcData, uint8 txType)'],
        params.data,
        true,
      );
      const decodedData = abiCoder.decode(
        [
          'tuple(bytes32 hashedUsername, bytes credentialId, tuple(uint8 kty, int8 alg, uint8 crv, uint256 x, uint256 y) pubkey, bytes32 optionalPassword)',
        ],
        decodedFuncData[0][0],
      );
      if (
        !decodedData[0].hashedUsername ||
        !decodedData[0].credentialId ||
        !decodedData[0].pubkey
      ) {
        throw new BlockchainCodeException({
          code: BlockchainErrorCode.INVALID_DATA_FOR_OASIS_SIGNATURE,
          status: 400,
        });
      }
    } catch (err) {
      if (err instanceof BlockchainCodeException) throw err;

      console.error(err);
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ERROR_DECODING_DATA_FOR_OASIS_SIGNATURE,
        status: 500,
        errorMessage: 'Error decoding and validating data to sign',
      });
    }

    //wallet
    const seed = await getWalletSeed(env.OASIS_SIGNING_WALLET);
    const signingWallet = new ethers.Wallet(seed);

    //provider
    const endpoint = await new Endpoint({}, context).populateByChain(
      EvmChain.OASIS,
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

    const gasPrice = (await provider.getFeeData()).gasPrice;

    const dataHash = ethers.utils.solidityKeccak256(
      ['uint256', 'uint256', 'bytes32'],
      [
        gasPrice,
        params.timestamp,
        ethers.utils.solidityKeccak256(['string'], [params.data]),
      ],
    );

    const signature = await signingWallet.signMessage(
      ethers.utils.toUtf8Bytes(dataHash),
    );

    return {
      dataHash,
      signature,
    };
  }
}
