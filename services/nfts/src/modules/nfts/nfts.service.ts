import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { MintNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/mint-nft-query-filter.dto';
import { SetNftBaseUriQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/set-nft-base-uri-query.dto';
import { NftTransaction } from '../../lib/nft-contract-transaction';
import {
  TransactionRequest,
  TransactionReceipt,
} from '@ethersproject/providers';
import { ethers, Wallet } from 'ethers';
import {
  AppEnvironment,
  env,
  NFTCollectionQueryFilter,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { TransferNftQueryFilter } from '@apillon/lib/dist/lib/at-services/nfts/dtos/transfer-nft-query-filter.dto';
import { TransactionService } from '../transaction/transaction.service';
import { ServiceContext } from '../../context';
import { TransactionDTO } from '../transaction/dtos/transaction.dto';
import {
  Chains,
  DbTables,
  NftsErrorCode,
  TransactionStatus,
  TransactionType,
} from '../../config/types';
import { WalletService } from '../wallet/wallet.service';
import {
  NftsCodeException,
  NftsValidationException,
} from '../../lib/exceptions';
import { Transaction } from '../transaction/models/transaction.model';
import { Collection } from './models/collection.model';
import { v4 as uuidV4 } from 'uuid';

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

    //Create collection object
    const collection: Collection = new Collection(
      params.body,
      context,
    ).populate({
      collection_uuid: uuidV4(),
      status: SqlModelStatus.INCOMPLETE,
    });

    try {
      await collection.validate();
    } catch (err) {
      await collection.handle(err);
      if (!collection.isValid()) throw new NftsValidationException(collection);
    }

    const conn = await context.mysql.start();

    try {
      //Insert collection record to DB
      await collection.insert(SerializeFor.INSERT_DB, conn);
      //Prepare transaction record
      const dbTxRecord: Transaction = new Transaction({}, context);
      await dbTxRecord.populateNonce(conn);
      if (!dbTxRecord.nonce) {
        //First transaction record - nonce should be acquired from chain
        dbTxRecord.nonce = await walletService.getCurrentMaxNonce();
      }
      params.body.nonce = dbTxRecord.nonce;

      //Send transaction to chain
      const txRequest: TransactionRequest =
        await walletService.createDeployTransaction(params.body);
      const rawTransaction = await walletService.signTransaction(txRequest);
      const txResponse = await walletService.sendTransaction(rawTransaction);
      //Populate DB transaction record with properties
      dbTxRecord.populate({
        chainId: Chains.MOONBASE,
        transactionType: TransactionType.DEPLOY_CONTRACT,
        rawTransaction: rawTransaction,
        refTable: DbTables.COLLECTION,
        refId: collection.id,
        transactionHash: txResponse.hash,
        transactionStatus: TransactionStatus.PENDING,
      });
      //Insert to DB
      await TransactionService.saveTransaction(context, dbTxRecord, conn);

      await context.mysql.commit(conn);
      return collection;
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.DEPLOY_NFT_CONTRACT_ERROR,
        context: context,
        sourceFunction: 'deployNftContract()',
        errorMessage: 'Error deploying Nft contract',
        details: err,
      }).writeToMonitor({});
    }
  }

  static async listNftCollections(
    event: { query: NFTCollectionQueryFilter },
    context: ServiceContext,
  ) {
    return await new Collection(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new NFTCollectionQueryFilter(event.query));
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
