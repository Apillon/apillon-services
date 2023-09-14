import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Wallet } from '../wallet/wallet.model';
import {
  ChainType,
  env,
  IsolationLevel,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
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
import { getWalletSeed } from '../../lib/seed';
import { CrustBlockchainIndexer } from '../blockchain-indexers/substrate/crust/crust-indexer.service';
import { KiltBlockchainIndexer } from '../blockchain-indexers/substrate/kilt/kilt-indexer.service';

class Api {
  protected endpointUrl: string = null;
  protected apiPromise: ApiPromise = null;
  protected provider: WsProvider = null;
  protected typesBundle: any = null;
  protected started: Date = null;

  constructor(endpointUrl: string, typesBundle: any) {
    this.endpointUrl = endpointUrl;
    this.typesBundle = typesBundle;
    this.started = new Date();
  }

  async destroy() {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
      this.apiPromise = null;
    }
    console.log('Timing after destroy', this.getTiming(), 's');
  }

  async getUnsignedTransaction(transaction: string) {
    console.log('Timing before unsigned transaction', this.getTiming(), 's');
    return (await this.getApi()).tx(transaction);
  }

  async send(rawTransaction: string) {
    console.log('Timing before send', this.getTiming(), 's');
    return (await this.getApi()).tx(rawTransaction).send();
  }

  /**
   * Tries to self repair nonce based on last on-chain nonce and indexer state.
   * @param wallet Wallet
   * @param transactionHash
   */
  async trySelfRepairNonce(wallet: Wallet, transactionHash: string) {
    console.log('Timing before self repair', this.getTiming(), 's');
    const nextOnChainNonce = (
      await (await this.getApi()).query.system.account(wallet.address)
    ).nonce.toNumber();
    if (!nextOnChainNonce) {
      return;
    }
    const lastProcessedNonce = nextOnChainNonce - 1;
    if (wallet.lastProcessedNonce > lastProcessedNonce) {
      return;
    }

    if (await isTransactionIndexed(wallet, transactionHash)) {
      return lastProcessedNonce;
    }
  }

  protected async getApi() {
    console.log('Timing before get API', this.getTiming(), 's');
    if (!this.provider) {
      this.provider = new WsProvider(this.endpointUrl);
      this.apiPromise = await ApiPromise.create({
        provider: this.provider,
        typesBundle: this.typesBundle,
        throwOnConnect: true,
      });
      console.log('Timing after first connect', this.getTiming(), 's');
      return this.apiPromise;
    } else {
      try {
        await this.provider.send('health_check', null);
        console.log('Timing after health check', this.getTiming(), 's');
        return this.apiPromise;
      } catch (e) {
        this.apiPromise = await ApiPromise.create({
          provider: this.provider,
          typesBundle: this.typesBundle,
          throwOnConnect: true,
        });
        console.log('Timing after reconnect', this.getTiming(), 's');
        return this.apiPromise;
      }
    }
  }

  protected getTiming() {
    if (!this.started) {
      return null;
    }
    return (new Date().getTime() - this.started.getTime()) / 1000;
  }
}

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
    const api = new Api(endpoint.url, typesBundle);
    console.info('Start db transaction.');
    // Start connection to database at the beginning of the function
    const conn = await context.mysql.start(IsolationLevel.READ_COMMITTED);

    try {
      let wallet = new Wallet({}, context);
      if (params.fromAddress) {
        wallet = await wallet.populateByAddress(
          params.chain,
          ChainType.SUBSTRATE,
          params.fromAddress,
          conn,
        );
      }
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
      const unsignedTx = await api.getUnsignedTransaction(params.transaction);
      // TODO: add validation service for transaction to detect and prevent weird transactions.

      // TODO: Determine the best era
      const signed = await unsignedTx.signAsync(pair, {
        nonce: wallet.nextNonce,
        era: 600, // number of blocks the transaction is valid - 6s per block * 6000 blocks / 60 = 600 minutes -> 10 hours
      });

      console.info('signAsync SUCCESSFUL. Saving transaction to DB.');
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
      await api.destroy();
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
    const wallets = await new Wallet({}, context).getWallets(
      _event.chain,
      ChainType.SUBSTRATE,
      _event.address,
    );
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
      ChainType.SUBSTRATE,
    );
    let typesBundle = null;
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
    const api = new Api(endpoint.url, typesBundle);
    for (const wallet of wallets) {
      const transactions = await new Transaction({}, context).getList(
        _event.chain,
        ChainType.SUBSTRATE,
        wallet.address,
        wallet.lastProcessedNonce,
      );
      if (!transactions.length) {
        continue;
      }

      let latestSuccess = null;
      let transmitted = 0;
      // TODO: consider batching transaction api.tx.utility.batch
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
          await api.send(transaction.rawTransaction);
          console.log('successfully transmitted');
          latestSuccess = transaction.nonce;
          transmitted++;
        } catch (err: any) {
          //try self repair else error
          if (
            err?.data === 'Transaction is outdated' ||
            (typeof err?.message === 'string' &&
              err.message.includes('Transaction is temporarily banned'))
          ) {
            const selfRepairNonce = await api.trySelfRepairNonce(
              wallet,
              transaction.transactionHash,
            );
            latestSuccess = selfRepairNonce;
            if (selfRepairNonce) {
              await eventLogger(
                {
                  logType: LogType.INFO,
                  message: `Last success nonce was repaired and set to ${selfRepairNonce}.`,
                  service: ServiceName.BLOCKCHAIN,
                  data: {
                    wallet: wallet.address,
                    selfRepairNonce,
                  },
                },
                LogOutput.EVENT_INFO,
              );
            } else {
              await eventLogger(
                {
                  logType: LogType.ERROR,
                  message: 'Could not repair last success nonce.',
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
            }
          } else {
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
            break;
          }
        }
      }

      if (latestSuccess) {
        const dbWallet = new Wallet(wallet, context);
        await dbWallet.updateLastProcessedNonce(latestSuccess);
      }
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
    }
    await api.destroy();
  }

  //#region
}

/**
 * Checks indexer to determine if transaction exists (is indexed).
 * @param wallet Wallet
 * @param transactionHash
 */
async function isTransactionIndexed(wallet: Wallet, transactionHash: string) {
  if (wallet.chainType !== ChainType.SUBSTRATE) {
    throw new BlockchainCodeException({
      code: BlockchainErrorCode.INVALID_CHAIN,
      status: 400,
      errorMessage: 'Only substrate chain types supported',
    });
  }
  let transactions = {};
  switch (wallet.chain) {
    case SubstrateChain.KILT:
      transactions =
        await new KiltBlockchainIndexer().getWalletTransactionsByHash(
          wallet.address,
          transactionHash,
        );
      break;
    case SubstrateChain.CRUST:
      transactions =
        await new CrustBlockchainIndexer().getWalletTransactionsByHash(
          wallet.address,
          transactionHash,
        );
      break;
    default:
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_CHAIN,
        status: 400,
        errorMessage: `Chain ${wallet.chain} is not supported.`,
      });
  }
  return Object.values(transactions).reduce(
    (transactionExists, transaction) =>
      transactionExists || (Array.isArray(transaction) && transaction.length),
    false,
  );
}
