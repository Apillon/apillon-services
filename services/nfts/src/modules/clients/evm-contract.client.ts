import {
  Contract,
  ContractFactory,
  providers,
  UnsignedTransaction,
} from 'ethers';
import { PopulatedTransaction } from '@ethersproject/contracts';

export class EVMContractClient {
  private static instance: EVMContractClient;
  private readonly contract: Contract;

  private constructor(contract: Contract) {
    this.contract = contract;
  }

  static async getInstance(
    rpcEndpoint: string,
    contractAbi: string,
    contractAddress: string,
  ) {
    if (!EVMContractClient.instance) {
      console.log(`RPC initialization ${rpcEndpoint}`);
      const provider = new providers.JsonRpcProvider(rpcEndpoint);
      const contract = new Contract(contractAddress, contractAbi, provider);
      EVMContractClient.instance = new EVMContractClient(contract);
    }
    return EVMContractClient.instance;
  }

  static async createDeployTransaction(
    contractAbi: string,
    byteCode?: string,
    constructorArguments: any[] = [],
  ): Promise<UnsignedTransaction> {
    const contractFactory = new ContractFactory(contractAbi, byteCode);

    return await contractFactory.getDeployTransaction.apply(
      null,
      constructorArguments,
    );
  }

  async query(methodName: string, methodArguments: any[] = []): Promise<any> {
    return await this.contract[methodName].apply(null, methodArguments);
  }

  async createTransaction(
    methodName: string,
    methodArguments: any[] = [],
  ): Promise<PopulatedTransaction> {
    return await this.contract.populateTransaction[methodName].apply(
      null,
      methodArguments,
    );
  }
}
