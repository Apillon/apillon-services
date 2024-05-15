import { Abi, BlueprintPromise, ContractPromise } from '@polkadot/api-contract';
import { encodeSalt } from '@polkadot/api-contract/base/util';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { KeyringPair } from '@polkadot/keyring/types';
import { WeightV2 } from '@polkadot/types/interfaces';

export class SubstrateContractClient {
  private static instance: SubstrateContractClient;

  private api: ApiPromise;
  private readonly blueprint: BlueprintPromise;
  private readonly contract: ContractPromise;
  private readonly dummyAccount: KeyringPair;

  private constructor(
    api: ApiPromise,
    blueprint: BlueprintPromise,
    contract: ContractPromise,
  ) {
    this.api = api;
    this.blueprint = blueprint;
    this.contract = contract;
    this.dummyAccount = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  }

  static async getInstance(
    rpcEndpoint: string,
    contractAbi: { [key: string]: any },
    contractAddress?: string,
  ) {
    if (!rpcEndpoint) {
      throw new Error(
        'RPC endpoint is not defined for substrate contract client',
      );
    }

    if (!SubstrateContractClient.instance) {
      const api = await ApiPromise.create({
        provider: new WsProvider(rpcEndpoint),
        // types: types as any,
        throwOnConnect: true,
      });
      console.log(`RPC initialization ${rpcEndpoint}`);
      const abi = new Abi(contractAbi, api.registry.getChainProperties());
      if (contractAddress) {
        const contract = new ContractPromise(api, abi, contractAddress);
        SubstrateContractClient.instance = new SubstrateContractClient(
          api,
          null,
          contract,
        );
      } else {
        const blueprint = new BlueprintPromise(
          api,
          abi,
          contractAbi.source.hash,
        );
        SubstrateContractClient.instance = new SubstrateContractClient(
          api,
          blueprint,
          null,
        );
      }
    }
    return SubstrateContractClient.instance;
  }

  toChainInt(value: number) {
    const decimals = this.api.registry.chainDecimals[0];

    return value * Math.pow(10, decimals);
  }

  async createDeployTransaction(
    constructorArguments: any[] = [],
  ): Promise<SubmittableExtrinsic<'promise'>> {
    this.checkBlueprint();
    try {
      const gasLimit = this.api.registry.createType<WeightV2>('WeightV2', {
        refTime: 70_000_000_000,
        proofSize: 1_000_000,
      });
      const options = {
        gasLimit,
        salt: encodeSalt(
          `${1000000000 + Math.round(Math.random() * 8999999999)}}`,
        ),
      };
      return this.blueprint.tx.new(...[options, ...constructorArguments]);
    } finally {
      await this.destroy();
    }
  }

  async query<T = any>(
    methodName: string,
    methodArguments: any[] = [],
  ): Promise<T> {
    this.checkContract();
    const { output } = await this.queryInternal(methodName, methodArguments);

    return output.toJSON().ok;
  }

  async createTransaction(
    methodName: string,
    methodArguments: any[] = [],
    callerAddress: string = null,
  ): Promise<SubmittableExtrinsic<'promise'>> {
    this.checkContract();
    const { gasRequired } = await this.estimateGas(
      methodName,
      methodArguments,
      callerAddress,
    );
    const multiplier = new BN(1.1);
    const gasLimit = this.api.registry.createType<WeightV2>('WeightV2', {
      refTime: gasRequired.refTime.toBn().mul(multiplier),
      proofSize: gasRequired.proofSize.toBn().mul(multiplier),
    });

    return this.contract.tx[methodName](...[{ gasLimit }, ...methodArguments]);
  }

  private async queryInternal(
    methodName: string,
    methodArguments: any[] = [],
    callerAddress: string = null,
  ): Promise<any> {
    const gasLimit = this.getDefaultGasLimit();
    const response = await this.contract.query[methodName](
      ...[
        callerAddress ?? this.dummyAccount.address,
        { gasLimit, storageDepositLimit: null },
        ...methodArguments,
      ],
    );

    if (response.result.isErr) {
      let display: string;
      if (response.result.asErr.isModule) {
        const dispatchError = this.api.registry.findMetaError(
          response.result.asErr.asModule,
        );
        display = dispatchError.docs.length
          ? dispatchError.docs.concat().toString()
          : dispatchError.name;
      } else {
        display = response.result.asErr.toString();
      }

      throw new Error(display);
    }

    // check application/contract errors
    if (response.result.isOk) {
      const flags = response.result.asOk.flags.toHuman();
      if (flags.includes('Revert')) {
        throw new Error('Contract will be Reverted');
      }
    }

    return response;
  }

  private async estimateGas(
    methodName: string,
    methodArguments: any[],
    callerAddress: string = null,
  ) {
    const { gasRequired, storageDeposit } = await this.queryInternal(
      methodName,
      methodArguments,
      callerAddress,
    );

    return {
      gasRequired,
      storageDeposit,
    };
  }

  private getDefaultGasLimit() {
    return this.api.registry.createType<WeightV2>('WeightV2', {
      refTime: '500000000000', //maxRefTime
      proofSize: '5242880', //maxProofSize
    });
  }

  checkBlueprint() {
    if (!this.blueprint) {
      throw new Error('Blueprint not instantiated since address was passed.');
    }
  }

  checkContract() {
    if (!this.contract) {
      throw new Error(
        'Contract not instantiated since address was not passed.',
      );
    }
  }

  async destroy() {
    if (SubstrateContractClient.instance) {
      await this.api.disconnect();
      this.api = null;
      SubstrateContractClient.instance = null;
    }
  }
}
