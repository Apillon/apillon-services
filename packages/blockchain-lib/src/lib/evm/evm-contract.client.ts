import {
  Contract,
  ContractFactory,
  ContractInterface,
  providers,
  utils,
} from 'ethers';

export class EVMContractClient {
  private readonly contract: Contract;

  public constructor(
    rpcEndpoint: string,
    contractAbi: ContractInterface,
    contractAddress: string,
  ) {
    if (!rpcEndpoint) {
      throw new Error('RPC endpoint is not defined for EVM contract client');
    }
    console.log(`RPC initialization ${rpcEndpoint}`);
    const provider = new providers.JsonRpcProvider(rpcEndpoint);
    this.contract = new Contract(contractAddress, contractAbi, provider);
  }

  static createDeployTransaction(
    contractAbi: ContractInterface,
    byteCode: string,
    constructorArguments: any[] = [],
  ): string {
    const contractFactory = new ContractFactory(contractAbi, byteCode);
    const tx = contractFactory.getDeployTransaction(...constructorArguments);

    return EVMContractClient.serializeTransaction(tx.data.toString());
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
    //return tx.data;

    return EVMContractClient.serializeTransaction(
      tx.data,
      this.contract.address,
    );
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
