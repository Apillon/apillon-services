import { ServiceContext } from '@apillon/service-lib';
import {
  BlockchainMicroservice,
  Chain,
  ChainType,
  EvmChain,
  Lmas,
  SubstrateChain,
  WalletRefillTransactionQueryFilter,
} from '@apillon/lib';
import { AnyChain, AssetAmount } from '@galacticcouncil/xcm-core';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { BigNumber } from '@galacticcouncil/sdk';
import { AssetManagementBaseService } from './asset-management-base.service';
import {
  AssetManagementCodeException,
  AssetManagementValidationException,
} from '../../../lib/exceptions';
import { AssetManagementErrorCode } from '../../../config/types';
import { Transaction } from '../models/transaction.model';

export class WalletRefillService extends AssetManagementBaseService {
  private readonly blockchainService: BlockchainMicroservice;
  private readonly srcChain: AnyChain;
  private readonly assetIdIn: string;
  private MIN_BALANCES: {
    hdx: 200n;
    dot: 500n;
  };

  constructor(
    context: ServiceContext,
    blockchainService: BlockchainMicroservice,
    logging: Lmas,
  ) {
    super(context, logging);
    this.blockchainService = blockchainService;
    // source
    this.srcChain = this.configService.getChain('hydradx');
    const srcAsset = this.configService.getAsset('dot');
    this.assetIdIn = `${this.configService.getChain(this.srcChain).getAssetId(srcAsset)}`;
    if (!this.assetIdIn) {
      throw new Error(
        `${srcAsset.originSymbol} is not supported as IN asset id`,
      );
    }
  }

  //#region ------------- PUBLIC -------------

  async getWallet(walletId: number) {
    const { success: walletSuccess, data: wallet } =
      await this.blockchainService.getWallet(walletId);
    if (!walletSuccess || !wallet) {
      throw new AssetManagementValidationException({
        code: AssetManagementErrorCode.WALLET_NOT_FOUND,
        property: 'walletId',
        message: `wallet with id ${walletId} not found`,
      });
    }
    return wallet;
  }

  async getEndpointUrl(chainType: ChainType, chain: Chain): Promise<string> {
    const { status: endpointStatus, data: endpoint } =
      await this.blockchainService.getChainEndpoint(
        SubstrateChain.HYDRATION,
        ChainType.SUBSTRATE,
      );
    if (!endpointStatus || !endpoint) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.WALLET_TOKEN_MISSING,
        status: 500,
        errorMessage: `endpoint for chain type ${chainType} and chain ${chain} not found`,
      });
    }

    return endpoint.url;
  }

  async getDestWalletAndEndpoint(walletId: number) {
    const signerEndpointUrl = await this.getEndpointUrl(
      ChainType.SUBSTRATE,
      SubstrateChain.HYDRATION,
    );
    const destWallet = await this.getWallet(walletId);
    if (!destWallet.token) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.WALLET_TOKEN_MISSING,
        status: 500,
        errorMessage: 'dest wallet token not set',
      });
    }
    // transfers supported by hydration
    if (
      (destWallet.chainType === ChainType.EVM &&
        destWallet.chain !== EvmChain.ETHEREUM) ||
      (destWallet.chainType === ChainType.SUBSTRATE &&
        ![
          SubstrateChain.CRUST,
          SubstrateChain.KILT,
          SubstrateChain.ASTAR,
          SubstrateChain.PHALA,
          SubstrateChain.SUBSOCIAL,
        ].includes(destWallet.chain as SubstrateChain))
    ) {
      throw new AssetManagementValidationException({
        code: AssetManagementErrorCode.CHAIN_NOT_SUPPORTED,
        property: 'walletId',
        message: `wallet ${destWallet.address} (chain ${destWallet.chain} and type ${destWallet.chainType}) is not supported by hydration transfer`,
      });
    }

    return { destWallet, hydrationRpcUrl: signerEndpointUrl };
  }

  async getSrcBalances(payerAddress: string) {
    return await this.hydraWallet.getBalances(this.srcChain, payerAddress);
  }

  async assertSufficientBalances(
    balances: AssetAmount[],
    minBalances: { [key: string]: bigint },
  ) {
    for (const token in minBalances) {
      const tokenBalance = balances.find((balance) => balance.key === token);
      if (!tokenBalance) {
        throw Error(`no ${token} balance`);
      }
      const minBalance =
        (minBalances[token] * 10n ** BigInt(tokenBalance.decimals)) /
        BigInt(1000);
      if (tokenBalance.amount < minBalance) {
        throw new AssetManagementCodeException({
          code: 500,
          status: AssetManagementErrorCode.TOKEN_BALANCE_TOO_LOW,
          errorMessage: `${token} balance lower than ${minBalance} (${tokenBalance.amount})`,
        });
      }
    }
  }

  async getSwapAndTransfer(
    payerAddress: string,
    rpcUrl: string,
    destChainName: string,
    amountIn: number,
    token: string,
    destAddress: string,
    amountOnWallet: bigint,
  ) {
    const destChain = this.configService.getChain(destChainName.toLowerCase());
    const destAsset = this.configService.getAsset(token.toLowerCase());
    // TODO: can we use destChain here instead of srcChain?
    const assetIdOut = `${this.configService.getChain(this.srcChain).getAssetId(destAsset)}`;
    if (!assetIdOut) {
      throw new AssetManagementCodeException({
        code: 500,
        status: AssetManagementErrorCode.ASSET_NOT_SUPPORTED,
        errorMessage: `${destAsset.originSymbol} is not supported as OUT asset id`,
      });
    }

    // transaction
    const transactions: SubmittableExtrinsic<'promise'>[] = [];
    const api = await ApiPromise.create({
      provider: new WsProvider(rpcUrl),
      throwOnConnect: true,
    });
    try {
      // SWAP
      const tradeAnsSwap = await this.getTradeTx(
        api,
        amountIn,
        this.assetIdIn,
        assetIdOut,
      );
      // amount reduced for 5% to account for slippage
      const amountOut = BigNumber(
        tradeAnsSwap.trade.toHuman().amountOut,
      ).multipliedBy(0.95);
      // skip swap if wallet has sufficient balance
      if (amountOut > BigNumber(amountOnWallet.toString())) {
        transactions.push(tradeAnsSwap.tx);
      }

      // TRANSFER
      const transferTx = await this.getTransferTx(
        api,
        destChain,
        destAddress,
        amountOut,
        destAsset.key,
        payerAddress,
      );
      transactions.push(transferTx);
      const transfer = {
        asset: { originSymbol: destAsset.originSymbol, key: destAsset.key },
        source: {
          address: payerAddress,
          ecosystem: this.srcChain.ecosystem,
          name: this.srcChain.name,
        },
        destination: {
          address: destAddress,
          chain: destChain,
          ecosystem: destChain.ecosystem,
          name: destChain.name,
        },
      };

      // batch TX
      const batchTx =
        transactions.length === 1
          ? transactions[0]
          : api.tx.utility.batchAll(transactions);

      return {
        transactionHex: batchTx.toHex(),
        transactionHash: batchTx.hash.toString(),
        trade: tradeAnsSwap ? tradeAnsSwap.trade.toHuman() : null,
        transfer,
      };
    } catch (e: unknown) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.GENERAL_SERVER_ERROR,
        status: 500,
        errorMessage: `unknown error when preparing trade and swap: ${e}`,
      });
    } finally {
      await api.disconnect();
    }
  }

  //#endregion
  async listTransactions(query: WalletRefillTransactionQueryFilter) {
    return await new Transaction({}, this.context).getList(query);
  }

  async getTransaction(transactionUuid: string): Promise<Transaction> {
    const transaction = await new Transaction({}, this.context).populateByUUID(
      transactionUuid,
    );
    if (!transaction.exists()) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.TRANSACTION_NOT_FOUND,
        status: 404,
        errorMessage: `Transaction with uuid ${transactionUuid} not found`,
      });
    }
    return transaction;
  }
}
