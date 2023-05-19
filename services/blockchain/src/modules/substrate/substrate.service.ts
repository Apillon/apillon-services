import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Wallet } from '../../common/models/wallet';
import {
  SubstrateChain,
  ChainType,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  env,
  TransactionStatus,
} from '@apillon/lib';
import { Endpoint } from '../../common/models/endpoint';
import { BlockchainErrorCode } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { Transaction } from '../../common/models/transaction';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';
import { ServiceContext } from '@apillon/service-lib';
import { IsolationLevel } from '@apillon/lib';
import { getWalletSeed } from '../../lib/seed';

export class SubstrateService {
  static async createTransaction(
    _event: {
      params: {
        transaction: string;
        chain: SubstrateChain;
        fromAddress?: string;
        referenceTable?: string;
        referenceId?: string;
      };
    },
    context: ServiceContext,
  ) {
    // connect to chain
    // TODO: Add logic if endpoint is unavailable to fetch the backup one.
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.params.chain,
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
    switch (_event.params.chain) {
      case SubstrateChain.KILT: {
        keyring = new Keyring({ ss58Format: 38, type: 'sr25519' });
        break;
      }
      case SubstrateChain.CRUST: {
        keyring = new Keyring({ type: 'sr25519' });
        typesBundle = typesBundleForPolkadot;
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
    });

    console.info('Start db transaction.');
    // Start connection to database at the beginning of the function
    const conn = await context.mysql.start(IsolationLevel.READ_COMMITTED);

    try {
      let wallet = new Wallet({}, context);

      // if specific address is specified to be used for this transaction fetch the wallet
      if (_event.params.fromAddress) {
        wallet = await wallet.populateByAddress(
          _event.params.chain,
          ChainType.SUBSTRATE,
          _event.params.fromAddress,
          conn,
        );
      }

      // if address is not specified or not found then get the least used wallet
      if (!wallet.exists()) {
        wallet = await wallet.populateByLeastUsed(
          _event.params.chain,
          ChainType.SUBSTRATE,
          conn,
        );
      }

      console.log('Wallet', wallet.serialize());
      console.info('Getting wallet seed, ...');
      const seed = await getWalletSeed(wallet.seed);

      console.info('Generating unsigned transaction');
      const pair = keyring.addFromUri(seed);
      const unsignedTx = api.tx(_event.params.transaction);
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
        chain: _event.params.chain,
        chainType: ChainType.SUBSTRATE,
        address: wallet.address,
        to: null,
        nonce: wallet.nextNonce,
        referenceTable: _event.params.referenceTable,
        referenceId: _event.params.referenceId,
        rawTransaction: signedSerialized,
        data: null,
        transactionHash: signed.hash.toString(),
        transactionStatus: TransactionStatus.PENDING,
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
          transaction: _event.params.transaction,
          chainType: ChainType.SUBSTRATE,
          chain: _event.params.chain,
          address: _event.params.fromAddress,
          referenceTable: _event.params.referenceTable,
          referenceId: _event.params.referenceId,
        },
      });

      try {
        await sendToWorkerQueue(
          env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
          WorkerName.TRANSMIT_SUBSTRATE_TRANSACTION,
          [
            {
              chain: _event.params.chain,
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
          transaction: _event.params.transaction,
          chain: _event.params.chain,
          chainType: ChainType.SUBSTRATE,
          address: _event.params.fromAddress,
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
   */
  static async transmitTransactions(
    _event: {
      chain: SubstrateChain;
      address?: string;
    },
    context: ServiceContext,
  ) {
    console.log('chain: ', _event.chain);
    console.log('address: ', _event.address);
    const wallets = await new Wallet({}, context).getList(
      _event.chain,
      ChainType.SUBSTRATE,
      _event.address,
    );
    console.log('wallets: ', wallets);
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
      ChainType.SUBSTRATE,
    );
    console.log('endpoint: ', endpoint.url);
    const provider = new WsProvider(endpoint.url);
    let typesBundle = null;
    switch (_event.chain) {
      case SubstrateChain.KILT: {
        break;
      }
      case SubstrateChain.CRUST: {
        typesBundle = typesBundleForPolkadot;
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
    });

    for (let i = 0; i < wallets.length; i++) {
      const transactions = await new Transaction({}, context).getList(
        _event.chain,
        ChainType.SUBSTRATE,
        wallets[i].address,
        wallets[i].lastProcessedNonce,
      );
      let latestSuccess = null;
      console.log('transactions: ', transactions);
      try {
        // TODO: consider batching transaction api.tx.utility.batch
        for (let j = 0; j < transactions.length; j++) {
          const signedTx = api.tx(transactions[j].rawTransaction);
          await signedTx.send();
          console.log('successfuly transmited');
          latestSuccess = transactions[j].nonce;
        }
      } catch (e) {
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: 'Error transmiting transaction',
          location: 'SubstrateService.transmitTransactions',
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
  }
  //#region
}
