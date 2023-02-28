import {
  DeployNftContractDto,
  Lmas,
  LogType,
  MintNftDTO,
  NFTCollectionQueryFilter,
  SerializeFor,
  ServiceName,
  SetCollectionBaseUriDTO,
  SqlModelStatus,
  TransferCollectionDTO,
} from '@apillon/lib';
import { TransactionRequest } from '@ethersproject/providers';
import { v4 as uuidV4 } from 'uuid';
import {
  Chains,
  DbTables,
  NftsErrorCode,
  TransactionStatus,
  TransactionType,
} from '../../config/types';
import { ServiceContext } from '../../context';
import {
  NftsCodeException,
  NftsValidationException,
} from '../../lib/exceptions';
import { Transaction } from '../transaction/models/transaction.model';
import { TransactionService } from '../transaction/transaction.service';
import { WalletService } from '../wallet/wallet.service';
import { Collection } from './models/collection.model';

export class NftsService {
  static async getHello() {
    return 'Hello world from NFTS microservice';
  }

  // TODO: Remove send transaction from all functions bellow, as we are planing to
  // send those in different worker/job
  static async deployNftContract(
    params: { body: DeployNftContractDto },
    context: ServiceContext,
  ) {
    console.log(`Deploying NFT: ${JSON.stringify(params.body)}`);
    const walletService = new WalletService();
    const walletAddress = await walletService.getWalletAddress();

    //test
    console.log('testing RPC calls');
    await walletService.getCurrentMaxNonce();

    //Create collection object
    const collection: Collection = new Collection(
      params.body,
      context,
    ).populate({
      isRevokable: false,
      isSoulbound: false,
      royaltiesFees: 5,
      royaltiesAddress: walletAddress,
      collection_uuid: uuidV4(),
      status: SqlModelStatus.INCOMPLETE,
    });

    try {
      await collection.validate();
    } catch (err) {
      await collection.handle(err);
      if (!collection.isValid()) {
        throw new NftsValidationException(collection);
      }
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

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'New NFT collection created and submited to deployment',
      location: 'NftsService/deployNftContract',
      service: ServiceName.NFTS,
      data: collection.serialize(),
    });

    return collection;
  }

  static async listNftCollections(
    event: { query: NFTCollectionQueryFilter },
    context: ServiceContext,
  ) {
    const collections: any[] = (
      await new Collection(
        { project_uuid: event.query.project_uuid },
        context,
      ).getList(context, new NFTCollectionQueryFilter(event.query))
    ).items;

    const walletService: WalletService = new WalletService();
    let responseCollections: any[];

    for (const collection of collections) {
      const mintedNr = collection.contractAddress
        ? await walletService.getMintedNftsNr(collection.contractAddress)
        : 0;

      responseCollections.push({
        ...collection,
        minted: mintedNr,
      });
    }
    return responseCollections;
  }

  static async transferCollectionOwnership(
    params: { body: TransferCollectionDTO },
    context: ServiceContext,
  ) {
    console.log(
      `Transfering NFT Collection (uuid=${params.body.collection_uuid}) ownership to wallet address: ${params.body.address}`,
    );
    const walletService = new WalletService();
    const collection: Collection = await NftsService.checkAndGetCollection(
      params.body.collection_uuid,
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
          params.body.address,
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

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'NFT collection ownership transfered',
      location: 'NftsService/transferCollectionOwnership',
      service: ServiceName.NFTS,
      data: collection.serialize(),
    });

    return collection.serialize(SerializeFor.PROFILE);
  }

  static async mintNftTo(
    params: { body: MintNftDTO },
    context: ServiceContext,
  ) {
    console.log(
      `Minting NFT Collection to wallet address: ${params.body.receivingAddress}`,
    );
    const walletService: WalletService = new WalletService();
    const collection: Collection = await NftsService.checkAndGetCollection(
      params.body.collection_uuid,
      walletService,
      'mintNftTo()',
      context,
    );

    const mintedNftsNr = await walletService.getMintedNftsNr(
      collection.contractAddress,
    );
    if (mintedNftsNr + params.body.quantity > collection.maxSupply) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.MINT_NFT_SUPPLY_ERROR,
        context: context,
        sourceFunction: 'mintNftTo()',
        errorMessage: 'Unable to mint new NFTs, out of supply!',
      });
    }

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
          collection.contractAddress,
          params.body,
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

    await new Lmas().writeLog({
      context,
      project_uuid: collection.project_uuid,
      logType: LogType.INFO,
      message: 'NFT minted',
      location: 'NftsService/mintNftTo',
      service: ServiceName.NFTS,
      data: {
        collection: collection.serialize(SerializeFor.PROFILE),
        body: params.body,
      },
    });

    return { success: true };
  }

  static async setNftCollectionBaseUri(
    params: {
      body: SetCollectionBaseUriDTO;
    },
    context: ServiceContext,
  ) {
    console.log(
      `Setting URI of NFT Collection (uuid=${params.body.collection_uuid}): ${params.body.uri}`,
    );
    const walletService = new WalletService();
    const collection: Collection = await NftsService.checkAndGetCollection(
      params.body.collection_uuid,
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
          collection.contractAddress,
          params.body.uri,
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
  ): Promise<Collection> {
    const collection: Collection = await new Collection(
      {},
      context,
    ).populateByUUID(collection_uuid);

    // Collection must exist and be confirmed on blockchain
    if (!collection.exists() || collection.contractAddress == null) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_CONTRACT_OWNER_ERROR,
        context: context,
        sourceFunction,
        errorMessage: 'Error obtaining Nft collection',
        details: 'Collection does not exist or is not confirmed on blockchain!',
      });
    }
    const currentOwner = await walletService.getContractOwner(
      collection.contractAddress,
    );
    const walletAddress = await walletService.getWalletAddress();

    if (walletAddress !== currentOwner) {
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.NFT_CONTRACT_OWNER_ERROR,
        context: context,
        sourceFunction,
        errorMessage: 'Error calling Nft contract function',
        details: 'Caller is not the owner',
      });
    }
    return collection;
  }
}
