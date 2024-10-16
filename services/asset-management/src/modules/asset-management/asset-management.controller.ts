import { v4 as uuidV4 } from 'uuid';
import {
  BlockchainMicroservice,
  ChainType,
  CreateSubstrateTransactionDto,
  EvmChain,
  getChainName,
  HttpException,
  Lmas,
  LogType,
  RefillWalletRequestDto,
  SerializeFor,
  SqlModelStatus,
  SubstrateChain,
  TransactionStatus,
  WalletRefillTransactionQueryFilter,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { WalletRefillService } from './services/wallet-refill.service';
import { Transaction } from './models/transaction.model';
import { TransactionRepository } from './repository/transaction-repository';
import { AssetManagementErrorCode, TransactionType } from '../../config/types';
import '@polkadot/api-augment';
import '@polkadot/rpc-augment';
import '@polkadot/types-augment';
import '@polkadot/types/interfaces';
import { MultisigTransactionService } from './services/multisig-transaction.service';
import {
  AssetManagementCodeException,
  AssetManagementValidationException,
} from '../../lib/exceptions';
import { RefillWalletDto } from '@apillon/blockchain-lib/common';

const MIN_BALANCES = {
  hdx: 200n,
  dot: 500n,
};

export class AssetManagementController {
  private readonly context: ServiceContext;
  private logging: Lmas;
  private readonly blockchainService: BlockchainMicroservice;
  private refillWalletService: WalletRefillService;
  private transactionRepository: TransactionRepository;

  constructor(
    context: ServiceContext,
    walletRefillService: WalletRefillService,
    blockchainService: BlockchainMicroservice,
    logging: Lmas,
    transactionRepository: TransactionRepository,
  ) {
    this.context = context;
    this.logging = logging;
    this.blockchainService = blockchainService;
    this.refillWalletService = walletRefillService;
    this.transactionRepository = transactionRepository;
  }

  //#region wallet refill functions

  async listWalletRefillTransactions(
    query: WalletRefillTransactionQueryFilter,
  ) {
    return await this.refillWalletService.listTransactions(
      new WalletRefillTransactionQueryFilter(query),
    );
  }

  async refillWallet(body: RefillWalletDto) {
    await this.logging.writeLog({
      message: `Refilling wallet with id ${body.walletId}`,
      context: this.context,
      logType: LogType.INFO,
      data: body,
    });
    const multisigWalletResponse =
      await this.blockchainService.getMultisigWallet(body.multisigWalletId);
    if (multisigWalletResponse.status !== 200) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.MULTISIG_WALLET_NOT_FOUND,
        status: 404,
        errorMessage: `Failed to retrieve multisig wallet ${body.multisigWalletId}`,
      });
    }
    const multisigWallet = multisigWalletResponse.data;
    if (
      multisigWallet.chainType !== ChainType.SUBSTRATE ||
      multisigWallet.chain !== SubstrateChain.HYDRATION
    ) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.CHAIN_NOT_SUPPORTED,
        status: 422,
        errorMessage: `Wallet refill only works with Substrate Hydration chain.`,
      });
    }

    const { hydrationRpcUrl, destWallet } =
      await this.refillWalletService.getDestWalletAndEndpoint(body.walletId);
    const isDestEthereum =
      destWallet.chainType === ChainType.EVM &&
      destWallet.chain === EvmChain.ETHEREUM;
    if (isDestEthereum && body.amountIn < 3) {
      throw new AssetManagementValidationException({
        code: AssetManagementErrorCode.DATA_NOT_VALID,
        property: 'amountIn',
        message: `AmountIn must be at least 3 for transferring to Ethereum chain`,
      });
    }
    const { success, data: wallets } = await this.blockchainService.getWallets(
      SubstrateChain.HYDRATION,
    );
    if (!success || !wallets) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.WALLET_NOT_FOUND,
        status: 404,
        errorMessage: `Wallet not found for Substrate Hydration chain.`,
      });
    }
    // TODO: first wallet is always a signer
    const signerWallet = wallets[0];
    try {
      const destChainName = getChainName(
        destWallet.chainType,
        destWallet.chain,
      );
      const payerAddress = multisigWallet.address;
      const srcBalances =
        await this.refillWalletService.getSrcBalances(payerAddress);
      await this.refillWalletService.assertSufficientBalances(
        srcBalances,
        // 1 GLMR for transfers to ethereum chain
        isDestEthereum
          ? {
              ...MIN_BALANCES,
              glmr: 1500n,
            }
          : MIN_BALANCES,
      );

      const tokenKey =
        destWallet.token === 'ETH'
          ? 'weth_mwh'
          : destWallet.token.toLowerCase();
      const destTokenSrcBalance =
        await this.refillWalletService.getTokenBalance(srcBalances, tokenKey);

      const { trade, transfer, transactionHex, transactionHash } =
        await this.refillWalletService.getSwapAndTransfer(
          payerAddress,
          hydrationRpcUrl,
          destChainName,
          body.amountIn,
          tokenKey,
          destWallet.address,
          destTokenSrcBalance.amount,
        );

      return await this.transactionRepository.createTransaction(
        new Transaction({}, this.context).populate({
          transactionType: TransactionType.SWAP_AND_TRANSFER,
          status: SqlModelStatus.ACTIVE,
          transactionStatus: TransactionStatus.DRAFT,
          transaction_uuid: uuidV4(),
          transactionHash,
          rawTransaction: transactionHex,
          chainType: signerWallet.chainType,
          chain: signerWallet.chain,
          multisigWalletId: multisigWallet.id,
          signerWalletId: signerWallet.id,
          refTable: 'wallets',
          refId: body.walletId,
          trade,
          transfer,
          signers: multisigWallet.signers,
          threshold: multisigWallet.threshold,
          payer: payerAddress,
          multisigBalances: srcBalances.map((srcBalance) => ({
            amount: srcBalance.amount.toString(),
            decimals: srcBalance.decimals,
            symbol: srcBalance.symbol,
          })),
        }),
      );
    } catch (e: unknown) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.ERROR_CREATING_REFILL_TRANSACTION,
        status: 500,
        errorMessage: `Failed to create refill transaction: ${e}`,
      });
    }
  }

  async refillWalletConfirm(body: RefillWalletRequestDto) {
    await this.logging.writeLog({
      message: `Confirming wallet refill for transaction with uuid ${body.transactionUuid}`,
      context: this.context,
      logType: LogType.INFO,
      data: body,
    });
    const transaction = await this.refillWalletService.getTransaction(
      body.transactionUuid,
    );
    if (transaction.transactionStatus !== TransactionStatus.DRAFT) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.MULTISIG_TRANSACTION_ALREADY_CONFIRMED,
        status: 500,
        errorMessage: `multisig transaction with uuid ${body.transactionUuid} was already confirmed`,
      });
    }
    const signerWallet = await this.refillWalletService.getWallet(
      transaction.signerWalletId,
    );
    const endpointUrl = await this.refillWalletService.getEndpointUrl(
      signerWallet.chainType,
      signerWallet.chain,
    );
    const multisigTxService = await MultisigTransactionService.getInstance(
      endpointUrl,
      signerWallet.address,
      transaction.signers,
      transaction.threshold,
      transaction.rawTransaction,
      transaction.payer,
    );
    try {
      const multiSigTx = await multisigTxService.prepareMultisigTx();
      const result = await this.blockchainService.createSubstrateTransaction(
        new CreateSubstrateTransactionDto({}, this.context).populate({
          transaction: multiSigTx.toHex(),
          chain: signerWallet.chain as SubstrateChain,
          fromAddress: signerWallet.address,
          referenceTable: 'asset_management',
          referenceId: transaction.transaction_uuid,
        }),
      );
      transaction.status = SqlModelStatus.ACTIVE;
      await transaction.update(SerializeFor.UPDATE_DB);

      return result.data;
    } catch (e: unknown) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.ERROR_CONFIRMING_MULTISIG_TRANSACTION,
        status: 500,
        errorMessage: `Failed to confirm multisig transaction with uuid ${body.transactionUuid}: ${e}`,
      });
    } finally {
      await multisigTxService.destroy();
    }
  }

  async refillWalletCancel(body: RefillWalletRequestDto) {
    await this.logging.writeLog({
      message: `Canceling wallet refill for transaction with uuid ${body.transactionUuid}`,
      context: this.context,
      logType: LogType.INFO,
      data: body,
    });
    const transaction = await this.refillWalletService.getTransaction(
      body.transactionUuid,
    );
    const signerWallet = await this.refillWalletService.getWallet(
      transaction.signerWalletId,
    );
    const endpointUrl = await this.refillWalletService.getEndpointUrl(
      signerWallet.chainType,
      signerWallet.chain,
    );
    const multisigTxService = await MultisigTransactionService.getInstance(
      endpointUrl,
      signerWallet.address,
      transaction.signers,
      transaction.threshold,
      transaction.rawTransaction,
      transaction.payer,
    );
    try {
      const multiSigTx = await multisigTxService.getCancelOperationTx();
      const result = await this.blockchainService.createSubstrateTransaction(
        new CreateSubstrateTransactionDto({}, this.context).populate({
          transaction: multiSigTx.toHex(),
          chain: signerWallet.chain as SubstrateChain,
          fromAddress: signerWallet.address,
          referenceTable: 'asset_management',
          referenceId: transaction.transaction_uuid,
        }),
      );
      transaction.status = SqlModelStatus.INACTIVE;
      transaction.transactionStatus = TransactionStatus.CANCELED;
      await transaction.update(SerializeFor.UPDATE_DB);

      return result.data;
    } catch (e: unknown) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.ERROR_CANCELING_MULTISIG_TRANSACTION,
        status: 500,
        errorMessage: `Failed to cancel multisig transaction with uuid ${body.transactionUuid}: ${e}`,
      });
    } finally {
      await multisigTxService.destroy();
    }
  }

  //#endregion
}
