import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { ContractFactory, ethers } from 'ethers';
import { PayableNft } from './contracts/payable-mint-nft';
import { TransactionRequest, BaseProvider } from '@ethersproject/providers';

export async function createDeployContractTransaction(
  params: DeployNftContractDto,
  provider: BaseProvider,
): Promise<TransactionRequest> {
  const walletAddress = '0xBa01526C6D80378A9a95f1687e9960857593983B';
  console.log(
    `Creating NFT deploy contract transaction from wallet address: ${walletAddress}`,
  );

  const nftContract: ContractFactory = new ContractFactory(
    PayableNft.abi,
    PayableNft.bytecode,
  );

  const contractData: TransactionRequest =
    await nftContract.getDeployTransaction(
      params.symbol,
      params.name,
      params.maxSupply,
      // params.body.mintPrice -> convert to wei
      10000000000000,
    );

  const maxPriorityFeePerGas = ethers.utils.parseUnits('30', 'gwei').toNumber();
  const estimatedBaseFee = (await provider.getGasPrice()).toNumber();

  // Ensuring that transaction is desirable for at least 6 blocks.
  const maxFeePerGas = estimatedBaseFee * 2 + maxPriorityFeePerGas;
  const chainId = (await provider.getNetwork()).chainId;

  const txCount = await provider.getTransactionCount(walletAddress);

  const transaction: TransactionRequest = {
    from: walletAddress,
    to: null,
    value: 0,
    gasLimit: '8000000',
    maxPriorityFeePerGas,
    maxFeePerGas,
    nonce: ethers.utils.hexlify(txCount),
    type: 2,
    chainId,
    data: contractData.data,
  };

  const gas = await provider.estimateGas(transaction);
  console.log(`Estimated gas=${gas}`);
  // Increasing gas limit by 10% of current gas price to be on the safe side
  const gasLimit = Math.floor(gas.toNumber() * 1.1);
  transaction.gasLimit = gasLimit.toString();

  return transaction;
}
