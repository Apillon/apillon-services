import { ServiceContext } from '../../context';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Wallet } from '../../common/models/wallet';
import { Chain, Lmas, LogType, SerializeFor, ServiceName } from '@apillon/lib';
import { Endpoint } from '../../common/models/endpoint';
import { BlockchainErrorCode } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { Transaction } from '../../common/models/transaction';
import { typesBundleForPolkadot } from '@crustio/type-definitions';

export class PolkadotService {
  static async sendTransaction(
    _event: {
      transaction: string;
      chain: Chain;
      address?: string;
      referenceTable?: string;
      referenceId?: string;
    },
    context: ServiceContext,
  ) {
    // connect to chain
    // TODO: Add logic if endpoint is unavailable to fetch the backup one.
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
    );
    const provider = new WsProvider(endpoint.url);

    // Start connection to database at the beginning of the function
    const conn = await context.mysql.start();

    try {
      let wallet = new Wallet({}, context);

      // if specific address is specified to be used for this transaction fetch the wallet
      if (_event.address) {
        wallet = await wallet.populateByAddress(
          _event.chain,
          _event.address,
          conn,
        );
      }

      // if address is not specified or not found then get the least used wallet
      if (!wallet.exists()) {
        wallet = await wallet.populateByLeastUsed(_event.chain, conn);
      }

      let keyring = new Keyring(); // generate privatekey from mnemonic - different for different chains
      let typesBundle = null; // different types for different chains
      switch (_event.chain) {
        case Chain.KILT: {
          keyring = new Keyring({ ss58Format: 38, type: 'sr25519' });
          break;
        }
        case Chain.CRUST: {
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
        typesBundle, // TODO: add
      });
      const pair = keyring.addFromUri(wallet.seed);
      const unsignedTx = api.tx(_event.transaction);

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
      signed.hash.toString();

      const transaction = new Transaction({}, context);
      transaction.populate({
        chain: _event.chain,
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
        location: 'PolkadotService.sendTransaction',
        service: ServiceName.BLOCKCHAIN,
        data: {
          transaction: _event.transaction,
          chain: _event.chain,
          address: _event.address,
          referenceTable: _event.referenceTable,
          referenceId: _event.referenceId,
        },
      });

      return transaction.serialize(SerializeFor.PROFILE);
    } catch (e) {
      //Write log to LMAS
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Error transmiting transaction',
        location: 'PolkadotService.sendTransaction',
        service: ServiceName.BLOCKCHAIN,
        data: {
          error: e,
          transaction: _event.transaction,
          chain: _event.chain,
          address: _event.address,
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

    // const signedTx = api.tx(signedSerialized);
    // console.log('Signed: ', signedTx);
    // console.log('Signed: ', signedTx.toJSON());
    // console.log('Signed: ', signedTx.toHex());
    // console.log('hash: ', signedTx.hash.toHuman());

    // await signedTx.send();
    /**
     * (({ status }) => {
      console.log(status);
      if (status.isInBlock) {
        console.log(`included in ${status.asInBlock}`);
      }
    }
     */
  }
  //#region
}
