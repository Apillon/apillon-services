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

      // Create transaction request to be sent on blockchain
      const txRequest: TransactionRequest =
        await walletService.createDeployTransaction(
          params.body,
          dbTxRecord.nonce,
        );
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

  static async transferNftOwnership(
    params: { query: TransferNftQueryFilter },
    context: ServiceContext,
  ) {
    console.log(
      `Transfering NFT Collection (uuid=${params.query.collection_uuid}) ownership to wallet address: ${params.query.address}`,
    );
    const walletService = new WalletService();
    const collection: Collection = await this.checkAndGetCollection(
      params.query.collection_uuid,
      walletService,
      'transferNftOwnership()',
      context,
    );

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      await dbTxRecord.populateNonce(conn);
      if (!dbTxRecord.nonce) {
        //First transaction record - nonce should be acquired from chain
        dbTxRecord.nonce = await walletService.getCurrentMaxNonce();
      }

      // Create transaction request to be sent on blockchain
      const txRequest: TransactionRequest =
        await walletService.createTransferOwnershipTransaction(
          collection.contractAddress,
          params.query.address,
          dbTxRecord.nonce,
        );
      const rawTransaction = await walletService.signTransaction(txRequest);
      const txResponse = await walletService.sendTransaction(rawTransaction);
      //Populate DB transaction record with properties
      dbTxRecord.populate({
        chainId: Chains.MOONBASE,
        transactionType: TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
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
        code: NftsErrorCode.TRANSFER_NFT_CONTRACT_ERROR,
        context: context,
        sourceFunction: 'transferNftOwnership()',
        errorMessage: 'Error transfering Nft contract',
        details: err,
      }).writeToMonitor({});
    }
  }

  static async mintNftTo(
    params: { query: MintNftQueryFilter },
    context: ServiceContext,
  ) {
    console.log(
      `Minting NFT Collection to wallet address: ${params.query.address}`,
    );
    const walletService: WalletService = new WalletService();
    const collection: Collection = await this.checkAndGetCollection(
      params.query.collection_uuid,
      walletService,
      'mintNftTo()',
      context,
    );

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      await dbTxRecord.populateNonce(conn);
      if (!dbTxRecord.nonce) {
        //First transaction record - nonce should be acquired from chain
        dbTxRecord.nonce = await walletService.getCurrentMaxNonce();
      }

      // Create transaction request to be sent on blockchain
      const txRequest: TransactionRequest =
        await await walletService.createMintToTransaction(
          collection.contractAddress, // Later obtain contract from DB by collection_uuid
          params.query.address,
          dbTxRecord.nonce,
        );

      const rawTransaction = await walletService.signTransaction(txRequest);
      const txResponse = await walletService.sendTransaction(rawTransaction);
      //Populate DB transaction record with properties
      dbTxRecord.populate({
        chainId: Chains.MOONBASE,
        transactionType: TransactionType.MINT_NFT,
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
        code: NftsErrorCode.MINT_NFT_ERROR,
        context: context,
        sourceFunction: 'mintNftTo()',
        errorMessage: 'Error minting NFT',
        details: err,
      }).writeToMonitor({});
    }
  }

  static async setNftCollectionBaseUri(
    params: {
      query: SetNftBaseUriQueryFilter;
    },
    context: ServiceContext,
  ) {
    console.log(
      `Setting URI of NFT Collection (uuid=${params.query.collection_uuid}): ${params.query.uri}`,
    );
    const walletService = new WalletService();
    const collection: Collection = await this.checkAndGetCollection(
      params.query.collection_uuid,
      walletService,
      'setNftCollectionBaseUri()',
      context,
    );

    const conn = await context.mysql.start();
    try {
      const dbTxRecord: Transaction = new Transaction({}, context);
      await dbTxRecord.populateNonce(conn);
      if (!dbTxRecord.nonce) {
        //First transaction record - nonce should be acquired from chain
        dbTxRecord.nonce = await walletService.getCurrentMaxNonce();
      }

      // Create transaction request to be sent on blockchain
      const txRequest: TransactionRequest =
        await await walletService.createSetNftBaseUriTransaction(
          collection.contractAddress, // Later obtain contract from DB by collection_uuid
          params.query.uri,
          dbTxRecord.nonce,
        );

      const rawTransaction = await walletService.signTransaction(txRequest);
      const txResponse = await walletService.sendTransaction(rawTransaction);
      //Populate DB transaction record with properties
      dbTxRecord.populate({
        chainId: Chains.MOONBASE,
        transactionType: TransactionType.SET_COLLECTION_BASE_URI,
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
        code: NftsErrorCode.SET_NFT_BASE_URI_ERROR,
        context: context,
        sourceFunction: 'setNftCollectionBaseUri()',
        errorMessage: 'Error setting NFT collection base uri',
        details: err,
      }).writeToMonitor({});
    }
  }

  private static async checkAndGetCollection(
    collection_uuid: string,
    walletService: WalletService,
    sourceFunction: string,
    context: ServiceContext,
  ) {
    const collection: Collection = await new Collection(
      {},
      context,
    ).getCollection(collection_uuid, context);

    if (!collection) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_CONTRACT_OWNER_ERROR,
        context: context,
        sourceFunction,
        errorMessage: 'Error obtaining Nft collection',
        details: 'Collection does not exist!',
      }).writeToMonitor({});
    }
    const currentOwner = await walletService.getContractOwner(
      collection.contractAddress,
    );
    // Obtaing wallet address from .env?
    if ('0xBa01526C6D80378A9a95f1687e9960857593983B' !== currentOwner) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_CONTRACT_OWNER_ERROR,
        context: context,
        sourceFunction,
        errorMessage: 'Error calling Nft contract function',
        details: 'Caller is not the owner',
      }).writeToMonitor({});
    }
    return collection;
  }
}
