import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { NftTransaction } from '../../lib/nft-contract-transaction';
import {
  TransactionRequest,
  TransactionReceipt,
} from '@ethersproject/providers';
import { ethers, Wallet } from 'ethers';
import { AppEnvironment, env } from '@apillon/lib';

export class NftsService {
  static async getHello() {
    return 'Hello world from NFTS microservice';
  }

  static async deployNftContract(params: { body: DeployNftContractDto }) {
    console.log(`Deploying NFT: ${JSON.stringify(params.body)}`);
    const prodEnv = env.APP_ENV == AppEnvironment.PROD;
    const provider = new ethers.providers.StaticJsonRpcProvider(
      prodEnv ? env.NFTS_MOONBEAM_MAINNET_RPC : env.NFTS_MOONBEAM_TESTNET_RPC,
      {
        chainId: prodEnv ? 1284 : 1287,
        name: prodEnv ? 'moonbeam' : 'moonbase-alphanet',
      },
    );
    // Verify contract - TODO
    const contractTx: TransactionRequest =
      await NftTransaction.createDeployContractTransaction(
        params.body,
        provider,
      );

    // Raw transaction can be signed elsewhere for the sake of security
    const privateKey = prodEnv
      ? env.NFTS_MOONBEAM_MAINNET_PRIVATEKEY
      : env.NFTS_MOONBEAM_TESTNET_PRIVATEKEY;
    const wallet = new Wallet(privateKey, provider);
    await wallet.signTransaction(contractTx);

    const deployedContract: TransactionReceipt = await (
      await wallet.sendTransaction(contractTx)
    ).wait(1);

    // Safe transaction hash, contract address to db, or atleast contract address
    return {
      transaction_hash: deployedContract.transactionHash,
      contract_address: deployedContract.contractAddress,
    };
  }

  static async transferNftOwnership(params: {
    address: string;
    collection_uuid: string;
  }) {
    console.log(
      `Transfering NFT Collection (uuid=${params.collection_uuid}) ownership to wallet address: ${params.address}`,
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
        '0xa1af3059e16a15ae06F6c642D806d33A39bd9d01', // Get from DB selected Collection (UUID)
        params.address,
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
      contract_address: transferedContract.contractAddress,
    };
  }

  static async mintNft(address: string, collection_uuid: string) {
    console.log(`Minting NFT Collection to wallet address: ${address}`);
  }

  static async setNftCollectionBaseUri(params: {
    collection_uuid: string;
    uri: string;
  }) {
    console.log(
      `Setting URI of NFT Collection (uuid=${params.collection_uuid}): ${params.uri}`,
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
        '0xa1af3059e16a15ae06F6c642D806d33A39bd9d01', // Get from DB selected Collection (UUID)
        params.uri,
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
      contract_address: setUriContract.contractAddress,
    };
  }
}
