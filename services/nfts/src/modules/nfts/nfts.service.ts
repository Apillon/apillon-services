import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { MintNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/mint-nft-query-filter.dto';
import { SetNftBaseUriQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/set-nft-base-uri-query.dto';
import { NftTransaction } from '../../lib/nft-contract-transaction';
import {
  TransactionRequest,
  TransactionReceipt,
} from '@ethersproject/providers';
import { ethers, Wallet } from 'ethers';
import { AppEnvironment, env } from '@apillon/lib';
import { TransferNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/transfer-nft-query-filter.dto';
import { TransactionService } from '../transaction/transaction.service';
import { ServiceContext } from '../../context';
import { TransactionDTO } from '../transaction/dtos/transaction.dto';
import { Chains, DbTables, TransactionType } from '../../config/types';
import { WalletService } from '../wallet/wallet.service';

export class NftsService {
  static async getHello() {
    return 'Hello world from NFTS microservice';
  }

  static async deployNftContract(
    params: { body: DeployNftContractDto },
    context: ServiceContext,
  ) {
    console.log(`Deploying NFT: ${JSON.stringify(params.body)}`);
    const walletService = new WalletService();
    const txRequest: TransactionRequest =
      await walletService.createDeployTransaction(params.body);
    const rawTransaction = await walletService.signTransaction(txRequest);

    //insert transaction to DB
    const tx: TransactionDTO = new TransactionDTO({}, context).populate({
      chainId: Chains.MOONBASE,
      transactionType: TransactionType.DEPLOY_CONTRACT,
      rawTransaction: rawTransaction,
      refTable: DbTables.COLLECTION,
      refId: 1,
    });
    const transaction = await TransactionService.saveTransaction(context, tx);
    return await TransactionService.sendTransaction(transaction);
  }

  static async transferNftOwnership(params: { query: TransferNftQueryFilter }) {
    console.log(
      `Transfering NFT Collection (uuid=${params.query.collection_uuid}) ownership to wallet address: ${params.query.address}`,
    );
    const prodEnv = env.APP_ENV == AppEnvironment.PROD;
    const provider = new ethers.providers.StaticJsonRpcProvider(
      prodEnv ? env.NFTS_MOONBEAM_MAINNET_RPC : env.NFTS_MOONBEAM_TESTNET_RPC,
      {
        chainId: prodEnv ? 1284 : 1287,
        name: prodEnv ? 'moonbeam' : 'moonbase-alphanet',
      },
    );

    const contractTx: TransactionRequest =
      await NftTransaction.createTransferOwnershipTransaction(
        params.query.collection_uuid, // Later obtain contract from DB by collection_uuid
        params.query.address,
        provider,
      );

    // Raw transaction can be signed elsewhere for the sake of security
    const privateKey = prodEnv
      ? env.NFTS_MOONBEAM_MAINNET_PRIVATEKEY
      : env.NFTS_MOONBEAM_TESTNET_PRIVATEKEY;
    const wallet = new Wallet(privateKey, provider);
    await wallet.signTransaction(contractTx);

    const transferedContract: TransactionReceipt = await (
      await wallet.sendTransaction(contractTx)
    ).wait(1);

    // Save transaction hash, contract address to db
    return {
      transaction_hash: transferedContract.transactionHash,
    };
  }

  static async mintNftTo(params: { query: MintNftQueryFilter }) {
    console.log(
      `Minting NFT Collection to wallet address: ${params.query.address}`,
    );
    const prodEnv = env.APP_ENV == AppEnvironment.PROD;
    const provider = new ethers.providers.StaticJsonRpcProvider(
      prodEnv ? env.NFTS_MOONBEAM_MAINNET_RPC : env.NFTS_MOONBEAM_TESTNET_RPC,
      {
        chainId: prodEnv ? 1284 : 1287,
        name: prodEnv ? 'moonbeam' : 'moonbase-alphanet',
      },
    );

    const contractTx: TransactionRequest =
      await NftTransaction.createMintToTransaction(
        params.query.collection_uuid, // Later obtain contract from DB by collection_uuid
        params.query.address,
        provider,
      );

    // Raw transaction can be signed elsewhere for the sake of security
    const privateKey = prodEnv
      ? env.NFTS_MOONBEAM_MAINNET_PRIVATEKEY
      : env.NFTS_MOONBEAM_TESTNET_PRIVATEKEY;
    const wallet = new Wallet(privateKey, provider);
    await wallet.signTransaction(contractTx);

    const mintNft: TransactionReceipt = await (
      await wallet.sendTransaction(contractTx)
    ).wait(1);

    return {
      transaction_hash: mintNft.transactionHash,
    };
  }

  static async setNftCollectionBaseUri(params: {
    query: SetNftBaseUriQueryFilter;
  }) {
    console.log(
      `Setting URI of NFT Collection (uuid=${params.query.collection_uuid}): ${params.query.uri}`,
    );
    const prodEnv = env.APP_ENV == AppEnvironment.PROD;
    const provider = new ethers.providers.StaticJsonRpcProvider(
      prodEnv ? env.NFTS_MOONBEAM_MAINNET_RPC : env.NFTS_MOONBEAM_TESTNET_RPC,
      {
        chainId: prodEnv ? 1284 : 1287,
        name: prodEnv ? 'moonbeam' : 'moonbase-alphanet',
      },
    );

    const contractTx: TransactionRequest =
      await NftTransaction.createSetNftBaseUriTransaction(
        params.query.collection_uuid, // Get from DB selected Collection (UUID)
        params.query.uri,
        provider,
      );

    // Raw transaction can be signed elsewhere for the sake of security
    const privateKey = prodEnv
      ? env.NFTS_MOONBEAM_MAINNET_PRIVATEKEY
      : env.NFTS_MOONBEAM_TESTNET_PRIVATEKEY;
    const wallet = new Wallet(privateKey, provider);
    await wallet.signTransaction(contractTx);

    const setUriContract: TransactionReceipt = await (
      await wallet.sendTransaction(contractTx)
    ).wait(1);

    /**
     * Save transaction hash, contract address to db
     * Should we have multiple tables with relations?
     * For example:
     * - Users - transaction, relation 1 to many
     * - transactions - nft-transactions - one to one?
     */
    return {
      transaction_hash: setUriContract.transactionHash,
    };
  }
}
