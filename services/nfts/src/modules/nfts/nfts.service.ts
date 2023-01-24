import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { createDeployContractTransaction } from '../../lib/nft-contract-transaction';
import {
  TransactionRequest,
  TransactionReceipt,
} from '@ethersproject/providers';
import { ethers, Wallet } from 'ethers';

export class NftsService {
  static async getHello() {
    return 'Hello world from NFTS microservice';
  }

  static async deployNftContract(params: { body: DeployNftContractDto }) {
    console.log(`Deploying NFT: ${JSON.stringify(params.body)}`);
    const rpcUrl = 'https://moonbase-alpha.public.blastapi.io'; // testnet if mainnet use: 'https://moonbeam.public.blastapi.io'
    const chainId = 1287; // testnet if mainnet use: 1284
    const chainName = 'moonbase-alphanet'; // testnet if mainnet use: moonbeam

    const provider = new ethers.providers.StaticJsonRpcProvider(
      rpcUrl, // Can also be in .env - based on env can be testnet/mainnet
      {
        chainId: chainId,
        name: chainName,
      },
    );

    const contractTx: TransactionRequest =
      await createDeployContractTransaction(params.body, provider);

    // Raw transaction can be signed elsewhere for the sake of security
    const privateKey =
      'a7eafaffdb2e5939231134a21b5b27ee30642a055a9d253fdd4df98d3cb125d6';
    const wallet = new Wallet(privateKey, provider);
    await wallet.signTransaction(contractTx);

    const deployedContract: TransactionReceipt = await (
      await wallet.sendTransaction(contractTx)
    ).wait(1);

    return {
      transaction_hash: deployedContract.transactionHash,
      contract_address: deployedContract.contractAddress,
    };
  }
}
