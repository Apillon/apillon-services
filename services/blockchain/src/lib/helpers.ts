import { EvmChain, SubstrateChain } from '@apillon/lib';
import { WorkerName } from '../workers/worker-executor';

export enum WorkerType {
  TRANSMIT = 1,
  PROCESS = 2,
}

export function evmChainToWorkerName(
  chain: EvmChain,
  type: WorkerType,
): string {
  switch (chain) {
    case EvmChain.ETHEREUM: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_ETHEREUM_TRANSACTIONS
        : WorkerName.VERIFY_ETHEREUM_TRANSACTIONS;
    }
    case EvmChain.SEPOLIA: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_SEPOLIA_TRANSACTIONS
        : WorkerName.VERIFY_SEPOLIA_TRANSACTIONS;
    }
    case EvmChain.MOONBEAM: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_MOONBEAM_TRANSACTIONS
        : WorkerName.VERIFY_MOONBEAM_TRANSACTIONS;
    }
    case EvmChain.MOONBASE: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_MOONBASE_TRANSACTIONS
        : WorkerName.VERIFY_MOONBASE_TRANSACTIONS;
    }
    case EvmChain.ASTAR: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_ASTAR_TRANSACTIONS
        : WorkerName.VERIFY_ASTAR_TRANSACTIONS;
    }
    case EvmChain.CELO: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_CELO_TRANSACTIONS
        : WorkerName.VERIFY_CELO_TRANSACTIONS;
    }
    case EvmChain.ALFAJORES: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_ALFAJORES_TRANSACTIONS
        : WorkerName.VERIFY_ALFAJORES_TRANSACTIONS;
    }
    default: {
      throw new Error('Unsupported');
    }
  }
}

export function substrateChainToWorkerName(chain: SubstrateChain): string {
  switch (chain) {
    case SubstrateChain.CRUST: {
      return WorkerName.TRANSMIT_CRUST_TRANSACTIONS;
    }
    case SubstrateChain.KILT: {
      return WorkerName.TRANSMIT_KILT_TRANSACTIONS;
    }
    case SubstrateChain.PHALA: {
      return WorkerName.TRANSMIT_PHALA_TRANSACTIONS;
    }
    case SubstrateChain.SUBSOCIAL: {
      return WorkerName.TRANSMIT_SUBSOCIAL_TRANSACTION;
    }
    case SubstrateChain.ASTAR: {
      return WorkerName.TRANSMIT_ASTAR_SUBSTRATE_TRANSACTIONS;
    }
    case SubstrateChain.ACURAST: {
      return WorkerName.TRANSMIT_ACURAST_TRANSACTIONS;
    }
    default: {
      throw new Error('Unsupported');
    }
  }
}
