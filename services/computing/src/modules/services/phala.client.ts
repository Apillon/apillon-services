import {
  BlockchainMicroservice,
  ChainType,
  Context,
  SubstrateChain,
} from '@apillon/lib';
import { Contract } from '../computing/models/contract.model';
import { SubstrateRpcApi } from '@apillon/blockchain/src/modules/substrate/rpc-api';
import {
  OnChainRegistry,
  PinkBlueprintPromise,
  PinkContractPromise,
  signCertificate,
  types,
} from '@phala/sdk';
import { ContractAbi } from '../computing/models/contractAbi.model';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ApiPromise, Keyring } from '@polkadot/api';

export class PhalaClient {
  private context: Context;
  private api: ApiPromise;
  private registry: OnChainRegistry;

  constructor(context: Context) {
    this.context = context;
  }

  /**
   * Function to initialize RPC provider. BCS is called to get endpoint, which is then used to initialize Provider
   * NOTE: This function should be called before each function in this class
   */
  async initializeProvider() {
    if (!this.api) {
      const rpcEndpoint = (
        await new BlockchainMicroservice(this.context).getChainEndpoint(
          SubstrateChain.PHALA,
          ChainType.SUBSTRATE,
        )
      ).data.url;
      console.log('rpcEndpoint', rpcEndpoint);
      this.api = await new SubstrateRpcApi(rpcEndpoint, types).getApi();
      this.registry = await OnChainRegistry.create(this.api);
      console.log(`RPC initialization ${rpcEndpoint}`);
    }
  }

  //CONTRACT TRANSACTIONS
  async createTransferOwnershipTransaction(
    contractAbi: { [key: string]: any },
    contractAddress: string,
    newOwnerAddress: string,
  ): Promise<SubmittableExtrinsic<'promise'>> {
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
    };
    return contract.tx.setOwner(options, newOwnerAddress);
  }

  async createAssignCidToNftTransaction(
    contractAbi: { [key: string]: any },
    contractAddress: string,
    cid: string,
    nftId: number,
  ) {
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
    };
    return contract.tx.setCid(options, nftId, cid);
  }

  async getClusterId() {
    await this.initializeProvider();
    return this.registry.clusterId;
  }

  async createDeployTransaction(
    contract: Contract,
    contractAbi: ContractAbi,
  ): Promise<SubmittableExtrinsic<'promise'>> {
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
  ) {
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
    return response.output.toJSON()['ok'].ok;
  }

  private async getContract(
    contractAddress: string,
    contractAbi: {
      [p: string]: any;
    },
  ) {
    const contractKey = await this.registry.getContractKeyOrFail(
      contractAddress,
    );
    return new PinkContractPromise(
      this.api,
      this.registry,
      contractAbi,
      contractAddress,
      contractKey,
    );
  }

  private async getDummyAccountAndCertificate() {
    const keyring = new Keyring({ type: 'sr25519' });
    const account = keyring.addFromUri('//Alice');
    const certificate = await signCertificate({ api: this.api, pair: account });

    return { account, certificate };
  }
}
