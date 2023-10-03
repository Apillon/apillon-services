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
    default: {
      throw new Error('Unsupported');
    }
  }
}
