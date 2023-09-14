import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Wallet } from '../wallet/wallet.model';
import {
  SubstrateChain,
  ChainType,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  env,
  TransactionStatus,
  getEnumKey,
} from '@apillon/lib';
import { Endpoint } from '../../common/models/endpoint';
import { BlockchainErrorCode } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { Transaction } from '../../common/models/transaction';
import { typesBundleForPolkadot as CrustTypesBundle } from '@crustio/type-definitions';
import { typesBundle as KiltTypesBundle } from '@kiltprotocol/type-definitions';
import { LogOutput, sendToWorkerQueue } from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';
import { ServiceContext } from '@apillon/service-lib';
import { IsolationLevel } from '@apillon/lib';
import { getWalletSeed } from '../../lib/seed';

export class SubstrateService {
  static async createTransaction(
    {
      params,
    }: {
      params: {
        transaction: string;
        chain: SubstrateChain;
        fromAddress?: string;
        referenceTable?: string;
        referenceId?: string;
        project_uuid?: string;
      };
    },
    context: ServiceContext,
  ) {
    // connect to chain
    // TODO: Add logic if endpoint is unavailable to fetch the backup one.
    const endpoint = await new Endpoint({}, context).populateByChain(
      params.chain,
      ChainType.SUBSTRATE,
    );

    if (!endpoint.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_CHAIN,
        status: 400,
      });
    }

    console.log('endpoint: ', endpoint.url);
    const provider = new WsProvider(endpoint.url);

    let keyring; // generate privatekey from mnemonic - different for different chains
    let typesBundle = null; // different types for different chains
    switch (params.chain) {
      case SubstrateChain.KILT: {
        keyring = new Keyring({ ss58Format: 38, type: 'sr25519' });
        typesBundle = KiltTypesBundle;
        break;
      }
      case SubstrateChain.CRUST: {
        keyring = new Keyring({ type: 'sr25519' });
        typesBundle = CrustTypesBundle;
        break;
      }
      default: {
        throw new BlockchainCodeException({
          code: BlockchainErrorCode.INVALID_CHAIN,
          status: 400,
        });
      }
    }

    console.info('Creating APIPromise');
    // TODO: Refactor to txwrapper when typesBundle supported
    const api = await ApiPromise.create({
      provider,
      typesBundle, // TODO: add
      throwOnConnect: true,
    });

    console.info('Start db transaction.');
    // Start connection to database at the beginning of the function
    const conn = await context.mysql.start(IsolationLevel.READ_COMMITTED);

    try {
      let wallet = new Wallet({}, context);

      // if specific address is specified to be used for this transaction fetch the wallet
      if (params.fromAddress) {
        wallet = await wallet.populateByAddress(
          params.chain,
          ChainType.SUBSTRATE,
          params.fromAddress,
          conn,
        );
      }

      // if address is not specified or not found then get the least used wallet
      if (!wallet.exists()) {
        wallet = await wallet.populateByLeastUsed(
          params.chain,
          ChainType.SUBSTRATE,
          conn,
        );
      }

      console.log('Wallet', wallet.serialize());
      console.info('Getting wallet seed, ...');
      const seed = await getWalletSeed(wallet.seed);

      console.info('Generating unsigned transaction');
      const pair = keyring.addFromUri(seed);
      console.log('Address: ', pair.address);
      const unsignedTx = api.tx(params.transaction);
      // TODO: add validation service for transaction to detect and prevent weird transactions.

      // TODO: Determine the best era
      const signed = await unsignedTx.signAsync(pair, {
        nonce: wallet.nextNonce,
        era: 600, // number of blocks the transaction is valid - 6s per block * 6000 blocks / 60 = 600 minutes -> 10 hours
      });

      console.info('signAsync SUCCESSFULL. Saving transaction to DB.');
      const signedSerialized = signed.toHex();

      const transaction = new Transaction({}, context);
      transaction.populate({
        chain: params.chain,
        chainType: ChainType.SUBSTRATE,
        address: wallet.address,
        to: null,
        nonce: wallet.nextNonce,
        referenceTable: params.referenceTable,
        referenceId: params.referenceId,
        rawTransaction: signedSerialized,
        data: null,
        transactionHash: signed.hash.toString(),
        transactionStatus: TransactionStatus.PENDING,
        project_uuid: params.project_uuid,
      });

      await transaction.insert(SerializeFor.INSERT_DB, conn);
      console.info('Transaction inserted. Iterating nonce ...');
      await wallet.iterateNonce(conn);

      await conn.commit();

      await new Lmas().writeLog({
        logType: LogType.INFO,
        message: 'Transaction signed',
        location: 'SubstrateService.createTransaction',
        service: ServiceName.BLOCKCHAIN,
        data: {
          transaction: params.transaction,
          chainType: ChainType.SUBSTRATE,
          chain: params.chain,
          address: params.fromAddress,
          referenceTable: params.referenceTable,
          referenceId: params.referenceId,
        },
      });

      try {
        await sendToWorkerQueue(
          env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
          WorkerName.TRANSMIT_SUBSTRATE_TRANSACTION,
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
          message:
            'Error triggering TRANSMIT_SUBSTRATE_TRANSACTIO worker queue',
          location: 'SubstrateService.createTransaction',
          service: ServiceName.BLOCKCHAIN,
          data: {
            error: e,
          },
        });
      }
      return transaction.serialize(SerializeFor.PROFILE);
    } catch (e) {
      //Write log to LMAS
      console.log(e);
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Error creating transaction',
        location: 'SubstrateService.createTransaction',
        service: ServiceName.BLOCKCHAIN,
        data: {
          error: e,
          transaction: params.transaction,
          chain: params.chain,
          chainType: ChainType.SUBSTRATE,
          address: params.fromAddress,
          referenceTable: params.referenceTable,
          referenceId: params.referenceId,
        },
      });
      await conn.rollback();
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ERROR_GENERATING_TRANSACTION,
        status: 500,
      });
    } finally {
      await api.disconnect();
    }
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
    if (!transaction.exists() || transaction.chainType != ChainType.SUBSTRATE) {
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
      chain: SubstrateChain;
      address?: string;
    },
    context: ServiceContext,
    eventLogger: (options: any, logOutput: LogOutput) => Promise<void>,
  ) {
    // console.log('chain: ', _event.chain);
    // console.log('address: ', _event.address);
    const wallets = await new Wallet({}, context).getWallets(
      _event.chain,
      ChainType.SUBSTRATE,
      _event.address,
    );
    // console.log('wallets: ', wallets);
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
      ChainType.SUBSTRATE,
    );
    // console.log('endpoint: ', endpoint.url);
    const provider = new WsProvider(endpoint.url);
    let typesBundle = null;
    // console.log('CHAIN  ', _event.chain);
    switch (_event.chain) {
      case SubstrateChain.KILT: {
        typesBundle = KiltTypesBundle;
        break;
      }
      case SubstrateChain.CRUST: {
        typesBundle = CrustTypesBundle;
        break;
      }
      default: {
        break;
      }
    }

    // TODO: Refactor to txwrapper when typesBundle supported
    const api = await ApiPromise.create({
      provider,
      typesBundle,
      throwOnConnect: true,
    });

    for (const wallet of wallets) {
      const transactions = await new Transaction({}, context).getList(
        _event.chain,
        ChainType.SUBSTRATE,
        wallet.address,
        wallet.lastProcessedNonce,
      );

      // continue to next wallet if there is no transactions!
      if (!transactions.length) {
        continue;
      }

      let latestSuccess = null;
      let transmitted = 0;
      // console.log('transactions: ', transactions);
      // TODO: consider batching transaction api.tx.utility.batch
      for (const transaction of transactions) {
        try {
          if (!api.isConnected) {
            await new Lmas().writeLog({
              logType: LogType.INFO,
              message: 'Reconnecting to RPC via ApiPromise',
              location: 'SubstrateService.createTransaction',
              service: ServiceName.BLOCKCHAIN,
            });
            await api.connect();
          }
          const signedTx = api.tx(transaction.rawTransaction);
          await signedTx.send();
          console.log('successfuly transmited');
          latestSuccess = transaction.nonce;
          transmitted++;
        } catch (err) {
          if (eventLogger) {
            await eventLogger(
              {
                logType: LogType.ERROR,
                message: `Error transmitting transaction on chain ${getEnumKey(
                  SubstrateChain,
                  _event.chain,
                )}! Hash: ${transaction.transactionHash}`,
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
              location: 'SubstrateService.transmitTransactions',
              service: ServiceName.BLOCKCHAIN,
              data: {
                error: err,
                wallet: wallet.address,
              },
            });
          }
          break;
        }
      }
      await api.disconnect();

      if (latestSuccess) {
        const dbWallet = new Wallet(wallet, context);
        await dbWallet.updateLastProcessedNonce(latestSuccess);
      }
      if (eventLogger) {
        await eventLogger(
          {
            logType: LogType.COST,
            message: 'Substrate transactions submitted',
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
          message: 'Substrate transactions submitted',
          location: `SubstrateService.transmitTransactions`,
          service: ServiceName.BLOCKCHAIN,
          data: {
            wallet,
            numOfTransactions: transactions.length,
            transmitted,
          },
        });
      }
    }
  }
  //#region
}
