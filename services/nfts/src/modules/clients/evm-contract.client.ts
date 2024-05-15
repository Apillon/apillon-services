import { Contract, ContractFactory, providers, utils } from 'ethers';

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
    if (!rpcEndpoint) {
      throw new Error('RPC endpoint is not defined for EVM contract client');
    }

    if (!EVMContractClient.instance) {
      console.log(`RPC initialization ${rpcEndpoint}`);
      const provider = new providers.JsonRpcProvider(rpcEndpoint);
      const contract = new Contract(contractAddress, contractAbi, provider);
      EVMContractClient.instance = new EVMContractClient(contract);
    }
    return EVMContractClient.instance;
  }

  static createDeployTransaction(
    contractAbi: string,
    byteCode?: string,
    constructorArguments: any[] = [],
  ): string {
    const contractFactory = new ContractFactory(contractAbi, byteCode);

    return contractFactory
      .getDeployTransaction(...constructorArguments)
      .data.toString();
  }

  async query<T = any>(
    methodName: string,
    methodArguments: any[] = [],
  ): Promise<T> {
    return await this.contract[methodName](...methodArguments);
  }

  async createTransaction(
    methodName: string,
    methodArguments: any[] = [],
  ): Promise<string> {
    const tx = await this.contract.populateTransaction[methodName](
      ...methodArguments,
    );
    return tx.data;
  }

  static serializeTransaction(
    data: string,
    to: string = null,
    type: number = 2,
  ): string {
    return utils.serializeTransaction({
      to,
      data,
      type,
    });
  }
}
