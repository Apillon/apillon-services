import {
  BlockchainMicroservice,
  ChainType,
  Context,
  SubstrateChain,
} from '@apillon/lib';
import { Contract } from '../computing/models/contract.model';
import { ApiPromise } from '@polkadot/api';
import { types } from '@phala/sdk';
import type { SubmittableExtrinsic } from '@polkadot/api/submittable/types';
import { SchrodingerContractABI } from '../../lib/contracts/deployed-phala-contracts';
import { SubstrateRpcApi } from '@apillon/blockchain/src/modules/substrate/rpc-api';
import { Abi } from '@polkadot/api-contract';

export class WalletService {
  private context: Context;
  private api: ApiPromise;

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

      this.api = await new SubstrateRpcApi(rpcEndpoint, types).getApi();
      console.log(`RPC initialization ${rpcEndpoint}`);
    }
  }

  async getClusterId() {
    // TODO: there is only one cluster so it's hardcoded but later we may retrieve it
    // await this.initializeProvider();
    // const phatRegistry = await OnChainRegistry.create(this.api);
    // return phatRegistry.clusterId;
    return '0x0000000000000000000000000000000000000000000000000000000000000001';
  }

  async createDeployTransaction(
    contract: Contract,
  ): Promise<SubmittableExtrinsic<'promise'>> {
    await this.initializeProvider();
    const abi = new Abi(SchrodingerContractABI);
    const callData = abi
      .findConstructor('new')
      .toU8a([contract.sourceHash, contract.data.restrictToOwner]);
    const options = {
      salt: 1000000000 + Math.round(Math.random() * 8999999999),
      transfer: 0,
      gasLimit: 1e12,
      storageDepositLimit: null,
      deposit: 0,
      transferToCluster: 1e12,
      adjustStake: 1e12,
    };

    return this.api.tx.phalaPhatContracts.instantiateContract(
      { WasmCode: SchrodingerContractABI.source.hash },
      callData,
      options.salt,
      contract.clusterId,
      options.transfer,
      options.gasLimit,
      options.storageDepositLimit,
      options.deposit,
    );
  }

  async createFundPhalaClusterTransaction(
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

  // async createTransferOwnershipTransaction(
  //   contract: string,
  //   newOwner: string,
  //   collectionType: NFTContractType,
  // ): Promise<UnsignedTransaction> {
  //   await this.initializeProvider();
  //   return await ComputingTransaction.createTransferOwnershipTransaction(
  //     this.evmChain,
  //     contract,
  //     newOwner,
  //     collectionType,
  //   );
  // }
}
