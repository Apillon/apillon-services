import { Keyring } from '@polkadot/keyring';
import { Wallet } from '../wallet/wallet.model';
import {
  AppEnvironment,
  ChainType,
  ClusterDepositTransaction,
  env,
  getChainName,
  getEnumKey,
  IsolationLevel,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
  TransmitMultiSigRequest,
  writeLog,
} from '@apillon/lib';
import { Endpoint } from '../../common/models/endpoint';
import { BlockchainErrorCode, DbTables } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { Transaction } from '../../common/models/transaction';
import { typesBundleForPolkadot as CrustTypesBundle } from '@crustio/type-definitions';
import { typesBundle as KiltTypesBundle } from '@kiltprotocol/type-definitions';
import { LogOutput, sendToWorkerQueue } from '@apillon/workers-lib';
import { ServiceContext } from '@apillon/service-lib';
import { getWalletSeed } from '../../lib/seed';
import { SubstrateRpcApi } from './rpc-api';
import { types as PhalaTypesBundle } from './types-bundle/phala-types';
import { substrateChainToWorkerName } from '../../lib/helpers';
import { typesBundle as SubsocialTypesBundle } from './types-bundle/subsocial/definitions';
import { PhalaBlockchainIndexer } from '../blockchain-indexers/substrate/phala/indexer.service';
import { transmitAndProcessSubstrateTransaction } from '../../lib/transmit-and-process-substrate-transaction';
import '@polkadot/api-augment';
import '@polkadot/rpc-augment';
import '@polkadot/types-augment';
import { blake2AsHex } from '@polkadot/util-crypto';

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
    console.info('SubstrateService.createTransaction. Params: ', params);
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
        keyring = new Keyring({ ss58Format: 66, type: 'sr25519' });
        typesBundle = CrustTypesBundle;
        break;
      }
      case SubstrateChain.PHALA: {
        keyring = new Keyring({ type: 'sr25519' });
        typesBundle = PhalaTypesBundle;
        break;
      }
      case SubstrateChain.XSOCIAL:
      case SubstrateChain.SUBSOCIAL: {
        keyring = new Keyring({ type: 'sr25519' });
        typesBundle = SubsocialTypesBundle;
        break;
      }
      case SubstrateChain.UNIQUE:
      case SubstrateChain.ASTAR:
      case SubstrateChain.ACURAST: {
        keyring = new Keyring({ type: 'sr25519' });
        break;
      }
      case SubstrateChain.HYDRATION: {
        keyring = new Keyring({ type: 'sr25519' });
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
    const api = new SubstrateRpcApi(endpoint.url, typesBundle);
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

      if (!wallet.exists()) {
        throw new BlockchainCodeException({
          code: BlockchainErrorCode.WALLET_DOES_NOT_EXISTS,
          status: 500,
        });
      }

      // If wallet balance is below minimum balance for sending a tx, throw an error
      const balanceData = await wallet.checkAndUpdateBalance(conn);
      if (balanceData.isBelowTransactionThreshold) {
        throw await new BlockchainCodeException({
          code: BlockchainErrorCode.ERROR_GENERATING_TRANSACTION,
          errorMessage: `Transaction can not be sent - balance below transaction minimum for wallet ${wallet.address} and chain ${getChainName(wallet.chainType, wallet.chain)}`,
          sourceFunction: 'SubstrateService.createTransaction',
          status: 500,
        }).writeToMonitor({
          logType: LogType.ERROR,
          service: ServiceName.BLOCKCHAIN,
          data: {
            ...balanceData,
            transaction: params.transaction,
            chain: params.chain,
            chainType: ChainType.SUBSTRATE,
            address: params.fromAddress,
            referenceTable: params.referenceTable,
            referenceId: params.referenceId,
          },
          sendAdminAlert: true,
        });
      }

      console.log('Wallet', wallet.serialize());
      console.info('Getting wallet seed, ...');
      const seed = await getWalletSeed(wallet.seed);
      const pair = keyring.addFromUri(seed);
      console.info('Generating unsigned transaction');
      const unsignedTx = await api.getUnsignedTransaction(params.transaction);
      // TODO: add validation service for transaction to detect and prevent weird transactions.
      console.log('signing transaction with key from address: ', pair.address);
      const signed = await unsignedTx.signAsync(pair, {
        nonce: wallet.nextNonce,
        era: 0, // immortal transaction
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

      if (
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
      ) {
        await transmitAndProcessSubstrateTransaction(context, api, transaction);
      } else {
        try {
          await sendToWorkerQueue(
            env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
            substrateChainToWorkerName(params.chain),
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
            message: `Error triggering TRANSMIT_SUBSTRATE_TRANSACTION worker queue: ${e}`,
            location: 'SubstrateService.createTransaction',
            service: ServiceName.BLOCKCHAIN,
            data: { error: e },
            sendAdminAlert: true,
          });
        }
      }
      return transaction.serialize(SerializeFor.PROFILE);
    } catch (e) {
      console.log(e);
      await conn.rollback();
      if (e instanceof BlockchainCodeException) {
        throw e;
      }
      throw await new BlockchainCodeException({
        code: BlockchainErrorCode.ERROR_GENERATING_TRANSACTION,
        errorMessage: `Error creating substrate transaction: ${e}`,
        sourceFunction: 'SubstrateService.createTransaction',
        status: 500,
      }).writeToMonitor({
        logType: LogType.ERROR,
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
        sendAdminAlert: true,
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

  static async getPhalaClusterDepositTransaction(
    event: {
      clusterDepositTransaction: ClusterDepositTransaction;
    },
    _context: ServiceContext,
  ) {
    const transactions =
      await new PhalaBlockchainIndexer().getClusterDepositTransactions(
        event.clusterDepositTransaction.account,
        [event.clusterDepositTransaction.transactionHash],
      );
    return transactions.length > 0 ? transactions[0] : null;
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
    writeLog(
      LogType.INFO,
      `Starting to transmit transactions for chain ${_event.chain} & address ${_event.address}.`,
    );

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
      case SubstrateChain.PHALA: {
        typesBundle = PhalaTypesBundle;
        break;
      }
      case SubstrateChain.XSOCIAL:
      case SubstrateChain.SUBSOCIAL: {
        typesBundle = SubsocialTypesBundle;
        break;
      }
      default: {
        break;
      }
    }

    // TODO: Refactor to txwrapper when typesBundle supported
    const api = new SubstrateRpcApi(endpoint.url, typesBundle);
    for (const wallet of wallets) {
      writeLog(
        LogType.INFO,
        `Processing wallet with address ${wallet.address} with last nonce ${wallet.lastProcessedNonce}`,
      );

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
        console.log(
          `Processing transaction with id ${transaction.id} (status=${transaction.transactionStatus}, ` +
            `nonce=${transaction.nonce},last updated=${transaction.updateTime}).`,
        );
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
          const result = await api.send(transaction.rawTransaction);
          console.log(
            `successfully transmitted tx with id ${transaction.id} on chain ${transaction.chainType}:`,
            result.toJSON(),
          );
          latestSuccess = transaction.nonce;
          transmitted++;
        } catch (err: any) {
          console.log(
            `error transmitting tx with id ${transaction.id} and nonce ${transaction.nonce}:`,
            err,
          );
          const chainName = getEnumKey(SubstrateChain, _event.chain);
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
                  message: `Last success nonce was repaired on chain ${chainName} for wallet address ${wallet.address} and set to ${selfRepairNonce} (hash=${transaction.transactionHash}).`,
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
                message: `Error transmitting transaction on chain ${chainName} for wallet address ${wallet.address} (nonce=${transaction.nonce}, hash=${transaction.transactionHash})!`,
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
            break;
          }
        }
      }

      writeLog(
        LogType.INFO,
        `Finished transmitting transactions for wallet with address ${wallet.address}. Latest success nonce: ${latestSuccess}.`,
      );

      if (latestSuccess !== null) {
        writeLog(
          LogType.INFO,
          `Updating wallet with last success nonce ${latestSuccess} for wallet address ${wallet.address} & id ${wallet.id}. `,
          'substrate.service.ts',
          'transmitTransactions',
        );
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

  // TODO: remove methods bellow after testing, this was moved to AssetManagement
  static async transmitMultiSigTransaction(
    event: { body: TransmitMultiSigRequest },
    context: ServiceContext,
  ) {
    const body = new TransmitMultiSigRequest({}, context).populate(event.body);
    //await body.validateOrThrow(ModelValidationException, ValidatorErrorCode);
    const signerWallet = await new Wallet({}, context).populateById(
      event.body.signerWalletId,
    );
    if (!signerWallet.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ENDPOINT_NOT_FOUND,
        status: 404,
        errorMessage: `Wallet with id ${event.body.signerWalletId} not found`,
      });
    }
    const signers = body.signers.filter(
      (signer: string) => signer !== signerWallet.address,
    );
    const endpoint = await new Endpoint({}, context).populateByChain(
      signerWallet.chain,
      signerWallet.chainType,
    );
    if (!endpoint.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ENDPOINT_NOT_FOUND,
        status: 404,
        errorMessage: `Endpoint not found for chain ${signerWallet.chain} on chain type ${signerWallet.chainType}`,
      });
    }

    const apiHelper = new SubstrateRpcApi(endpoint.url);
    const api = await apiHelper.getApi();
    try {
      const multiSigTx = api.tx.multisig.asMulti(
        body.threshold,
        signers,
        body.timePoint,
        api.tx(body.transactionHex).method.toHex(),
        { refTime: 70_000_000_000, proofSize: 1_000_000 },
      );
      return await SubstrateService.createTransaction(
        {
          params: {
            transaction: multiSigTx.toHex(),
            chain: signerWallet.chain as SubstrateChain,
            fromAddress: signerWallet.address,
            referenceTable: DbTables.WALLET,
            referenceId: event.body.signerWalletId.toString(),
          },
        },
        context,
      );
    } catch (e: unknown) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ERROR_GENERATING_TRANSACTION,
        status: 500,
        errorMessage: `Failed to create transaction: ${e}`,
      });
    } finally {
      await apiHelper.destroy();
    }
  }

  // TODO: remove methods bellow after testing, this was moved to AssetManagement
  static async cancelMultiSigTransaction(
    event: { body: TransmitMultiSigRequest },
    context: ServiceContext,
  ) {
    const body = new TransmitMultiSigRequest({}, context).populate(event.body);
    const signerWallet = await new Wallet({}, context).populateById(
      event.body.signerWalletId,
    );
    if (!signerWallet.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ENDPOINT_NOT_FOUND,
        status: 404,
        errorMessage: `Wallet with id ${event.body.signerWalletId} not found`,
      });
    }
    const endpoint = await new Endpoint({}, context).populateByChain(
      signerWallet.chain,
      signerWallet.chainType,
    );
    if (!endpoint.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ENDPOINT_NOT_FOUND,
        status: 404,
        errorMessage: `Endpoint not found for chain ${signerWallet.chain} on chain type ${signerWallet.chainType}`,
      });
    }

    const signers = body.signers.filter(
      (signer) => signer !== signerWallet.address,
    );

    const apiHelper = new SubstrateRpcApi(endpoint.url);
    const api = await apiHelper.getApi();
    try {
      const callHash = blake2AsHex(api.tx(body.transactionHex).method.toHex());
      const multiSigTx = api.tx.multisig.cancelAsMulti(
        body.threshold,
        signers,
        body.timePoint,
        callHash,
      );
      return await SubstrateService.createTransaction(
        {
          params: {
            transaction: multiSigTx.toHex(),
            chain: signerWallet.chain as SubstrateChain,
            fromAddress: signerWallet.address,
            referenceTable: DbTables.WALLET,
            referenceId: event.body.signerWalletId.toString(),
          },
        },
        context,
      );
    } catch (e: unknown) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.ERROR_GENERATING_TRANSACTION,
        status: 500,
        errorMessage: `Failed to create transaction: ${e}`,
      });
    } finally {
      await apiHelper.destroy();
    }
  }
  //#region
}
