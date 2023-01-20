import { Contract, ethers, UnsignedTransaction } from 'ethers';
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

    const unsignedContractTx: UnsignedTransaction =
      await nftContract.getDeployTransaction([
        params.nftSymbol,
        params.nftName,
        params.maxSupply,
        params.mintPrice,
      ]);

    // Gas price limit could be database property limit if needed
    //     gasLimit?: BigNumberish;
    //     gasPrice?: BigNumberish;
    //     maxPriorityFeePerGas?: BigNumberish;
    //     maxFeePerGas?: BigNumberish;
    console.log(
      `Current gas prices and limits on moonbeam: 
        gasLimit=${unsignedContractTx.gasLimit}, 
        gasPrice=${unsignedContractTx.gasPrice}, 
        maxPriorityFeePerGas=${unsignedContractTx.maxPriorityFeePerGas}
        maxFeePerGas=${unsignedContractTx.maxFeePerGas}`,
    );
  }
}
