import { ServiceContext } from '../../context';
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
} from '@apillon/lib';
import { Endpoint } from '../../common/models/endpoint';
import { BlockchainErrorCode } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { Transaction } from '../../common/models/transaction';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';

export class SubstrateService {
  static async createTransaction(
    _event: {
      transaction: string;
      chain: SubstrateChain;
      fromAddress?: string;
      referenceTable?: string;
      referenceId?: string;
    },
    context: ServiceContext,
  ) {
    // connect to chain
    // TODO: Add logic if endpoint is unavailable to fetch the backup one.
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
      ChainType.SUBSTRATE,
    );

    if (!endpoint.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_CHAIN,
        status: 400,
      });
    }

    const provider = new WsProvider(endpoint.url);

    // Start connection to database at the beginning of the function
    const conn = await context.mysql.start();

    try {
      let wallet = new Wallet({}, context);

      // if specific address is specified to be used for this transaction fetch the wallet
      if (_event.fromAddress) {
        wallet = await wallet.populateByAddress(
          _event.chain,
          ChainType.SUBSTRATE,
          _event.fromAddress,
          conn,
        );
      }

      // if address is not specified or not found then get the least used wallet
      if (!wallet.exists()) {
        wallet = await wallet.populateByLeastUsed(
          _event.chain,
          ChainType.SUBSTRATE,
          conn,
        );
      }

      let keyring = new Keyring(); // generate privatekey from mnemonic - different for different chains
      let typesBundle = null; // different types for different chains
      switch (_event.chain) {
        case SubstrateChain.KILT: {
          keyring = new Keyring({ ss58Format: 38, type: 'sr25519' });
          break;
        }
        case SubstrateChain.CRUST: {
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

      // TODO: Refactor to txwrapper when typesBundle supported
      const api = await ApiPromise.create({
        provider,
        typesBundle, // TODO: add
      });
      const pair = keyring.addFromUri(wallet.seed);
      const unsignedTx = api.tx(_event.transaction);
      // TODO: add validation service for transaction to detect and prevent weird transactions.

      // const info = await unsignedTx.paymentInfo(pair);
      // console.log(`
      //   class=${info.class.toString()},
      //   weight=${info.weight.toString()},
      //   partialFee=${info.partialFee.toHuman()}
      // `);

      // TODO: Determine the best era
      const signed = await unsignedTx.signAsync(pair, {
        nonce: wallet.nextNonce,
        era: 150, // number of blocks the transaction is valid - 6s per block * 150 blocks / 60 = 15 minutes
      });

      await wallet.iterateNonce(conn);

      const signedSerialized = signed.toHex();

      const transaction = new Transaction({}, context);
      transaction.populate({
        chain: _event.chain,
        chainType: ChainType.SUBSTRATE,
        address: wallet.address,
        nonce: wallet.nextNonce,
        referenceTable: _event.referenceTable,
        referenceId: _event.referenceId,
        rawTransaction: signedSerialized,
        transactionHash: signed.hash.toString(),
      });

      await transaction.insert(SerializeFor.INSERT_DB, conn);

      await conn.commit();

      await new Lmas().writeLog({
        logType: LogType.INFO,
        message: 'Transaction signed',
        location: 'SubstrateService.createTransaction',
        service: ServiceName.BLOCKCHAIN,
        data: {
          transaction: _event.transaction,
          chainType: ChainType.SUBSTRATE,
          chain: _event.chain,
          address: _event.fromAddress,
          referenceTable: _event.referenceTable,
          referenceId: _event.referenceId,
        },
      });
      // TODO: push queue message to worker to transmit
      return transaction.serialize(SerializeFor.PROFILE);
    } catch (e) {
      //Write log to LMAS
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Error creating transaction',
        location: 'SubstrateService.createTransaction',
        service: ServiceName.BLOCKCHAIN,
        data: {
          error: e,
          transaction: _event.transaction,
          chain: _event.chain,
          chainType: ChainType.SUBSTRATE,
          address: _event.fromAddress,
          referenceTable: _event.referenceTable,
          referenceId: _event.referenceId,
        },
      });
      await conn.rollback();
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ERROR_GENERATING_TRANSACTION,
        status: 500,
      });
    }
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
    const wallets = await new Wallet({}, context).getList(
      _event.chain,
      ChainType.SUBSTRATE,
      _event.address,
    );
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
      ChainType.SUBSTRATE,
    );
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
      try {
        // TODO: consider batching transaction api.tx.utility.batch
        for (let j = 0; j < transactions.length; j++) {
          const signedTx = api.tx(transactions[j].rawTransaction);
          await signedTx.send();
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
      const wallet = new Wallet(wallets[i], context);
      wallet.populate({ lastProcessedNonce: latestSuccess });
      await wallet.update();
    }
    await sendToWorkerQueue(
      env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
      WorkerName.SCHEDULER,
      [
        {
          chain: _event.chain,
        },
      ],
      null,
      null,
    );
  }
  //#region
}
