import { Lmas, LogType, ServiceName } from '@apillon/lib';
import { Contract } from '../computing/models/contract.model';
import {
  OnChainRegistry,
  periodicityChecker,
  PinkBlueprintPromise,
  PinkContractPromise,
  signCertificate,
  types,
} from '@phala/sdk';
import { ContractAbi } from '../computing/models/contractAbi.model';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import randomBytes from 'randombytes';
import { hexAddPrefix } from '@polkadot/util';

export class PhalaClient {
  private api: any;
  private registry: OnChainRegistry;
  private readonly rpcEndpoint: string;

  constructor(rpcEndpoint: string) {
    this.rpcEndpoint = rpcEndpoint;
  }

  static getRandomNonce() {
    return hexAddPrefix(randomBytes(32).toString('hex'));
  }

  async destroy() {
    if (this.registry) {
      await this.api.disconnect();
      this.api = null;
      this.registry = null;
    }
  }

  /**
   * Function to initialize RPC provider. BCS is called to get endpoint, which is then used to initialize Provider
   * NOTE: This function should be called before each function in this class
   */
  async initializeProvider() {
    if (!this.api) {
      this.api = await ApiPromise.create({
        provider: new WsProvider(this.rpcEndpoint),
        types: types as any,
        throwOnConnect: true,
      });

      this.registry = await OnChainRegistry.create(this.api, {
        strategy: periodicityChecker(),
      });
      console.log(`Phala client initialization ${this.rpcEndpoint}`);
    }
  }

  //CONTRACT TRANSACTIONS
  async createTransferOwnershipTransaction(
    contractAbi: { [key: string]: any },
    contractAddress: string,
    nonce: `0x${string}`,
    newOwnerAddress: string,
  ): Promise<any> {
    await this.initializeProvider();
    const contract = await this.getContract(contractAddress, contractAbi);
    const { account, certificate } = await this.getDummyAccountAndCertificate();
    const { gasRequired, storageDeposit } = await contract.query.setOwner(
      account.address,
      { cert: certificate },
      newOwnerAddress,
    );
    const options = {
      gasLimit: gasRequired.refTime.toString(),
      storageDepositLimit: storageDeposit.asCharge,
      nonce,
    };
    return contract.tx.setOwner(options, newOwnerAddress);
  }

  async createAssignCidToNftTransaction(
    contractAbi: { [key: string]: any },
    contractAddress: string,
    nonce: `0x${string}`,
    cid: string,
    nftId: number,
  ): Promise<any> {
    await this.initializeProvider();
    const contract = await this.getContract(contractAddress, contractAbi);
    const { account, certificate } = await this.getDummyAccountAndCertificate();
    const { gasRequired, storageDeposit } = await contract.query.setCid(
      account.address,
      { cert: certificate },
      nftId,
      cid,
    );
    const options = {
      gasLimit: gasRequired.refTime.toString(),
      storageDepositLimit: storageDeposit.asCharge,
      nonce,
    };
    return contract.tx.setCid(options, nftId, cid);
  }

  async getClusterId() {
    await this.initializeProvider();
    return this.registry.clusterId;
  }

  async getPruntimeUrl() {
    await this.initializeProvider();
    return this.registry.pruntimeURL;
  }

  async createDeployTransaction(
    contract: Contract,
    contractAbi: ContractAbi,
  ): Promise<any> {
    await this.initializeProvider();

    const blueprintPromise = new PinkBlueprintPromise(
      this.api,
      this.registry,
      contractAbi.abi,
      contractAbi.abi.source.hash,
    );

    const options = {
      transfer: 0,
      gasLimit: 1e12,
      storageDepositLimit: null,
      deposit: 0,
      transferToCluster: 1e12,
      adjustStake: 1e12,
    };
    return blueprintPromise.tx.new(
      options,
      contract.data.nftContractAddress.slice(2),
      contract.data.nftChainRpcUrl,
      contract.data.ipfsGatewayUrl,
      contract.data.restrictToOwner,
    );
  }

  async createDepositToClusterTransaction(
    clusterId: string,
    accountAddress: string,
    amount: number,
  ): Promise<SubmittableExtrinsic<'promise'>> {
    await this.initializeProvider();
    const roundedAmount = Number((amount * 1e12).toFixed(0)) + 1;
    return this.api.tx.phalaPhatContracts.transferToCluster(
      roundedAmount,
      clusterId,
      accountAddress,
    );
  }

  //CONTRACT QUERIES
  async encryptContent(
    contractAbi: { [key: string]: any },
    contractAddress: string,
    content: string,
  ) {
    await this.initializeProvider();
    const contract = await this.getContract(contractAddress, contractAbi);
    const { account, certificate } = await this.getDummyAccountAndCertificate();

    const response = await contract.query.encryptContent(
      account.address,
      {
        cert: certificate,
      },
      content,
    );
    if (response.output.isEmpty || response.output.isErr) {
      throw new Error('Failed to encrypt content, contract returned no data.');
    }

    return response.output.toJSON()['ok'].ok;
  }

  private async getContract(
    contractAddress: string,
    contractAbi: {
      [p: string]: any;
    },
  ) {
    const contractKey =
      await this.registry.getContractKeyOrFail(contractAddress);
    return new PinkContractPromise(
      this.api,
      this.registry,
      contractAbi,
      contractAddress,
      contractKey,
    );
  }

  /**
   * Gets dummy account for querying smart contract.
   * In computing service we don't have access to wallet private key that is why
   * we use a dummy/test account for querying contract which doesn't mind which
   * account query is sent for.
   * @private
   */
  private async getDummyAccountAndCertificate() {
    const keyring = new Keyring({ type: 'sr25519' });
    const account = keyring.addFromUri('//Alice');
    const certificate = await signCertificate({ api: this.api, pair: account });

    return { account, certificate };
  }

  async getPhalaLogRecordsAndGasPrice(phalaLogFilter: {
    type: 'Log' | 'Event' | 'MessageOutput' | 'QueryIn' | 'TooLarge';
    clusterId: string;
    pruntimeUrl: string;
    contract?: string;
    nonce?: string;
  }) {
    await this.initializeProvider();
    console.log('Fetching gas price and logs with filter: ', phalaLogFilter);
    try {
      const phatRegistry = await OnChainRegistry.create(this.api, {
        clusterId: phalaLogFilter.clusterId,
        pruntimeURL: phalaLogFilter.pruntimeUrl,
      });
      const gasPrice = phatRegistry.gasPrice.toNumber();
      console.log(`Retrieved gas price=${gasPrice}.`);
      const { records } = await phatRegistry.loggerContract.tail(
        10000,
        this.removeObjectKeysWithNullValue(phalaLogFilter),
      );
      console.log(`Retrieved ${records.length} log records.`);
      return { records, gasPrice };
    } catch (e: unknown) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `Error fetching phala logs or gas price.`,
        location: 'SubstrateService.getPhalaClusterWalletBalance',
        service: ServiceName.BLOCKCHAIN,
        data: {
          error: e,
          clusterId: phalaLogFilter.clusterId,
          contract: phalaLogFilter.contract,
          nonce: phalaLogFilter.nonce,
          type: phalaLogFilter.type,
        },
      });
      throw e;
    }
  }

  async getPhalaClusterWalletBalance(clusterId: string, walletAddress: string) {
    await this.initializeProvider();
    try {
      const phatRegistry = await OnChainRegistry.create(this.api, {
        clusterId,
      });
      const balance = await phatRegistry.getClusterBalance(walletAddress);

      console.log(
        `Retrieved balance total ${balance.total} and free ${balance.free}`,
      );
      return {
        total: balance.total.toNumber(),
        free: balance.free.toNumber(),
      };
    } catch (e: unknown) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `Error fetching cluster ${walletAddress} balance.`,
        location: 'SubstrateService.getPhalaClusterWalletBalance',
        service: ServiceName.BLOCKCHAIN,
        data: {
          error: e,
          clusterId,
          walletAddress,
        },
      });
      throw e;
    }
  }

  protected removeObjectKeysWithNullValue(obj: any) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v != null),
    );
  }
}
