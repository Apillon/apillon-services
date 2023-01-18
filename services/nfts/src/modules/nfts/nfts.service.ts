import { Contract, ethers } from 'ethers';
import { PayableNft } from '../../lib/contracts/payable-mint-nft';

export class NftsService {
  static async getHello() {
    return 'Hello world from NFTS microservice';
  }

  static async deployNftContract(params: {
    nftSymbol: string;
    nftName: string;
    maxSupply: bigint;
    mintPrice: bigint;
  }) {
    console.log(`Deploying NFT: ${params}`);
    const provider = new ethers.providers.StaticJsonRpcProvider(
      'https://moonbeam.public.blastapi.io', // Can also be in .env - based on enviorment can be testnet/mainnet
      {
        chainId: 1284,
        name: 'moonbeam',
      },
    );

    const nftContract = new Contract(PayableNft.abi, PayableNft.bytecode);

    const transaction = nftContract.deploy(
      params.nftName,
      params.nftSymbol,
      params.maxSupply,
      params.mintPrice,
    );
  }
}
