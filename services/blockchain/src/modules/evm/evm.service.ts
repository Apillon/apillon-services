import {
  EvmChain,
  ChainType,
  Lmas,
  LogType,
  ServiceName,
  SerializeFor,
} from '@apillon/lib';
import { Endpoint } from '../../common/models/endpoint';
import { ServiceContext } from '../../context';
import { ethers } from 'ethers';
import { BlockchainCodeException } from '../../lib/exceptions';
import { BlockchainErrorCode } from '../../config/types';
import { Wallet } from '../../common/models/wallet';
import { Transaction } from '../../common/models/transaction';

export class EvmService {
  static async createTransaction(
    _event: {
      chain: EvmChain;
      fromAddress?: string;
      transaction: string;
      referenceTable?: string;
      referenceId?: string;
    },
    context: ServiceContext,
  ) {
    // connect to chain
    // TODO: Add logic if endpoint is unavailable to fetch the backup one.
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
      ChainType.EVM,
    );

    if (!endpoint.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_CHAIN,
        status: 400,
      });
    }

    const provider = new ethers.providers.JsonRpcProvider(endpoint.url);
    let maxPriorityFeePerGas;
    let maxFeePerGas;
    let type;
    let gasPrice;
    // eslint-disable-next-line sonarjs/no-small-switch
    switch (_event.chain) {
      case EvmChain.MOONBASE:
      case EvmChain.MOONBEAM: {
        maxPriorityFeePerGas = ethers.utils.parseUnits('30', 'gwei').toNumber();
        const estimatedBaseFee = (await provider.getGasPrice()).toNumber();
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
      if (_event.fromAddress) {
        wallet = await wallet.populateByAddress(
          _event.chain,
          ChainType.EVM,
          _event.fromAddress,
          conn,
        );
      }

      // if address is not specified or not found then get the least used wallet
      if (!wallet.exists()) {
        wallet = await wallet.populateByLeastUsed(
          _event.chain,
          ChainType.EVM,
          conn,
        );
      }

      // parse and set transaction information
      const unsignedTx = ethers.utils.parseTransaction(_event.transaction);
      unsignedTx.from = wallet.address;

      unsignedTx.maxPriorityFeePerGas =
        ethers.BigNumber.from(maxPriorityFeePerGas);
      unsignedTx.maxFeePerGas = ethers.BigNumber.from(maxFeePerGas);
      unsignedTx.gasPrice = gasPrice;
      unsignedTx.type = type;

      const gas = await provider.estimateGas(unsignedTx);
      console.log(`Estimated gas=${gas}`);
      // Increasing gas limit by 10% of current gas price to be on the safe side
      const gasLimit = Math.floor(gas.toNumber() * 1.1);
      unsignedTx.gasLimit = ethers.BigNumber.from(gasLimit);

      // sign transaction
      const signingWallet = new ethers.Wallet(wallet.seed);
      console.log(unsignedTx);
      const rawTransaction = await signingWallet.signTransaction(unsignedTx);

      // save transaction
      const transaction = new Transaction({}, context);
      transaction.populate({
        chain: _event.chain,
        chainType: ChainType.EVM,
        address: wallet.address,
        nonce: wallet.nextNonce,
        referenceTable: _event.referenceTable,
        referenceId: _event.referenceId,
        rawTransaction,
        transactionHash: ethers.utils.keccak256(rawTransaction),
      });
      await transaction.insert(SerializeFor.INSERT_DB, conn);
      await wallet.iterateNonce(conn);

      await conn.commit();

      return transaction.serialize();
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
          transaction: _event.transaction,
          chain: _event.chain,
          chainType: ChainType.EVM,
          fromAddress: _event.fromAddress,
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
    //#region
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
      case EvmChain.MOONBEAM: {
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
      const wallet = new Wallet(wallets[i], context);
      wallet.populate({ lastProcessedNonce: latestSuccess });
      await wallet.update();
    }
    // TODO: call transaction checker
  }
}
